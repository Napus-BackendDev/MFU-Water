import dns from 'node:dns'
dns.setServers(['8.8.8.8', '1.1.1.1'])

import { MongoClient, GridFSBucket } from 'mongodb'
import { loadServerEnv } from '../api/express-app.js'
import { databaseTarget } from '../api/surveys/_shared.js'

async function syncNewsToProd() {
  console.log('🔄 เริ่มต้นกระบวนการ Sync ข้อมูลข่าวจาก Local Database -> Production Database...')

  // 1. โหลด Environment
  loadServerEnv()
  const devTarget = databaseTarget()
  
  process.env.APP_ENV = 'production'
  const prodTarget = databaseTarget()

  if (!prodTarget.mongoUri) {
    throw new Error('ไม่พบ MONGODB_URI สำหรับ Production')
  }

  console.log(`📍 Local Database: ${devTarget.mongoUri} / ${devTarget.dbName}`)
  console.log(`📍 Production Database: [Atlas] / ${prodTarget.dbName}`)

  // 2. เชื่อมต่อ Local และ Production
  const devClient = new MongoClient(devTarget.mongoUri, { serverSelectionTimeoutMS: 5000 })
  const prodClient = new MongoClient(prodTarget.mongoUri, { serverSelectionTimeoutMS: 10000 })

  await devClient.connect()
  console.log('✅ เชื่อมต่อ Local MongoDB สำเร็จ')
  await prodClient.connect()
  console.log('✅ เชื่อมต่อ Production MongoDB สำเร็จ')

  const devDb = devClient.db(devTarget.dbName)
  const prodDb = prodClient.db(prodTarget.dbName)

  const devBucket = new GridFSBucket(devDb, { bucketName: 'news_photos' })
  const prodBucket = new GridFSBucket(prodDb, { bucketName: 'news_photos' })

  try {
    // 3. อ่านบทความข่าวจาก Local
    const localArticles = await devDb.collection('kok_news_articles').find({}).toArray()
    console.log(`📄 พบข่าวใน Local ทั้งหมด: ${localArticles.length} รายการ`)

    // 4. ตรวจสอบและ Sync ไฟล์ภาพ GridFS ทั้งหมดที่เกี่ยวข้อง
    const localFiles = await devDb.collection('news_photos.files').find({}).toArray()
    console.log(`🖼️  พบไฟล์ภาพใน Local GridFS ทั้งหมด: ${localFiles.length} ไฟล์`)

    // ดึงรายชื่อไฟล์ภาพที่ข่าวใน Local เรียกใช้จริง
    const referencedFilenames = new Set()
    for (const article of localArticles) {
      if (article.cover_image_url && article.cover_image_url.startsWith('/api/news/photo/')) {
        referencedFilenames.add(article.cover_image_url.replace('/api/news/photo/', ''))
      }
      if (Array.isArray(article.gallery_image_urls)) {
        for (const url of article.gallery_image_urls) {
          if (url && url.startsWith('/api/news/photo/')) {
            referencedFilenames.add(url.replace('/api/news/photo/', ''))
          }
        }
      }
    }
    console.log(`🎯 ไฟล์ภาพที่ข่าวชุดนี้ใช้งานจริง: ${referencedFilenames.size} ไฟล์`)

    const existingProdFiles = await prodDb.collection('news_photos.files').find({}).toArray()
    const existingProdFilenames = new Set(existingProdFiles.map(f => f.filename))

    // Sync ไฟล์ภาพใน GridFS
    let uploadedCount = 0
    for (const fileDoc of localFiles) {
      const filename = fileDoc.filename
      // Sync ไฟล์ที่ถูกเรียกใช้ หรือไฟล์ทั้งหมดใน local
      if (existingProdFilenames.has(filename)) {
        continue
      }

      const mime = fileDoc.contentType || fileDoc.metadata?.contentType || 'image/jpeg'
      const downloadStream = devBucket.openDownloadStreamByName(filename)
      const uploadStream = prodBucket.openUploadStream(filename, {
        contentType: mime,
        metadata: {
          contentType: mime,
          originalName: fileDoc.metadata?.originalName || filename,
          syncedFrom: 'local_dev',
          syncedAt: new Date(),
        }
      })

      await new Promise((resolve, reject) => {
        downloadStream.pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve)
      })
      uploadedCount++
      console.log(`   + คัดลอกภาพขึ้น Production GridFS: ${filename} (${(fileDoc.length / 1024).toFixed(1)} KB)`)
    }
    console.log(`✅ คัดลอกภาพเข้า Production GridFS เสร็จสิ้น: เพิ่มใหม่ ${uploadedCount} ไฟล์`)

    // 5. Backup ข้อมูลข่าวเดิมใน Production
    const prodArticlesBefore = await prodDb.collection('kok_news_articles').find({}).toArray()
    if (prodArticlesBefore.length > 0) {
      const backupCollectionName = `kok_news_articles_backup_${Date.now()}`
      await prodDb.collection(backupCollectionName).insertMany(prodArticlesBefore)
      console.log(`💾 สำรองข้อมูลข่าวเดิมใน Production (${prodArticlesBefore.length} รายการ) ไว้ที่ ${backupCollectionName}`)
    }

    // 6. อัปเดตข้อมูลข่าวใน Production
    // ล้างข้อมูลข่าวเดิมออก แล้วใส่ข้อมูลจาก Local
    await prodDb.collection('kok_news_articles').deleteMany({})

    const cleanedArticles = localArticles.map(a => {
      const { _id, ...rest } = a
      return {
        ...rest,
        published_at: rest.published_at ? new Date(rest.published_at) : new Date(),
        created_at: rest.created_at ? new Date(rest.created_at) : new Date(),
        updated_at: rest.updated_at ? new Date(rest.updated_at) : new Date(),
      }
    })

    const insertResult = await prodDb.collection('kok_news_articles').insertMany(cleanedArticles)
    console.log(`✅ นำเข้าข้อมูลข่าวสารลง Production สำเร็จ: ${insertResult.insertedCount} รายการ`)

    // 7. สร้าง/ยืนยัน Indexes บน Production
    await prodDb.collection('kok_news_articles').createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { is_pinned: -1, published_at: -1 } },
      { key: { status: 1 } },
      { key: { category: 1 } },
      { key: { community_id: 1 } },
    ])
    console.log('✅ ตรวจสอบและสร้าง Indexes บน Production เรียบร้อย')

    // 8. ตรวจสอบความถูกต้องรอบสุดท้าย (Verification)
    const prodArticlesAfter = await prodDb.collection('kok_news_articles').find({}).sort({ is_pinned: -1, published_at: -1 }).toArray()
    console.log('\n📊 สรุปรายการข่าวบน Production Database ล่าสุด:')
    for (const a of prodArticlesAfter) {
      const coverFilename = a.cover_image_url?.replace('/api/news/photo/', '')
      const coverExists = coverFilename ? await prodDb.collection('news_photos.files').findOne({ filename: coverFilename }) : null
      console.log(` - [${a.id}] ${a.title.slice(0, 45)}... | ปักหมุด: ${a.is_pinned} | รูปปก: ${coverExists ? '✅ มีไฟล์' : '⚠️ ไม่มี/URL ตรง'}`)
    }

  } finally {
    await devClient.close()
    await prodClient.close()
    console.log('\n🔒 ปิดการเชื่อมต่อฐานข้อมูลเรียบร้อย')
  }
}

syncNewsToProd().catch((err) => {
  console.error('❌ เกิดข้อผิดพลาดในการ Sync ข้อมูลข่าว:', err)
  process.exit(1)
})
