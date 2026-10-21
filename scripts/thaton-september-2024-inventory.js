// Public satellite imagery only. No household data, credentials or asset writes.
var aoi = ee.Geometry.Rectangle([99.34486,20.03986,99.38514,20.08014],null,false);
var start = '2024-08-20', end = '2024-09-23';
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(aoi).filterDate(start,end)
  .filter(ee.Filter.eq('instrumentMode','IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VH'));
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate(start,end);
function inventory(collection,radar) {
  return collection.sort('system:time_start').toList(100).map(function(item) {
    var image = ee.Image(item);
    var common = ee.Dictionary({id:image.id(),dateUtc:ee.Date(image.get('system:time_start')).format("YYYY-MM-dd'T'HH:mm:ss",'UTC'),
      dateBangkok:ee.Date(image.get('system:time_start')).format("YYYY-MM-dd'T'HH:mm:ss",'Asia/Bangkok')});
    if (radar) return common.combine(ee.Dictionary({pass:image.get('orbitProperties_pass'),relativeOrbit:image.get('relativeOrbitNumber_start')}));
    var scl = image.select('SCL');
    var clear = scl.eq(4).or(scl.eq(5)).or(scl.eq(6));
    var stats = clear.unmask(0).reduceRegion({reducer:ee.Reducer.mean(),geometry:aoi,scale:20,maxPixels:1e7});
    return common.combine(ee.Dictionary({tile:image.get('MGRS_TILE'),tileCloudPercent:image.get('CLOUDY_PIXEL_PERCENTAGE'),aoiClearFraction:stats.get('SCL')}));
  });
}
ee.Dictionary({aoi:aoi.coordinates(),sentinel1:inventory(s1,true),sentinel2:inventory(s2,false)})
  .evaluate(function(result,error) {print('INVENTORY_JSON',error || JSON.stringify(result));});
Map.centerObject(aoi,14);
Map.addLayer(aoi,{color:'yellow'},'Thaton comparison boundary');
