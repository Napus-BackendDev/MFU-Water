// Recheck the exact 15 September scene at its native optical grid.
var source = ee.Image('COPERNICUS/S2_SR_HARMONIZED/20240915T034529_20240915T035607_T47QNC');
var optical = source.select(['B4','B3','B2','B8','B11','B12']).resample('bilinear');
var image = optical.addBands(source.select('SCL')).addBands(ee.Image.pixelLonLat());
image.toDouble().unmask(-9999).getDownloadURL({
  crs:'EPSG:32647',crs_transform:[10,0,536020,0,-10,2220400],dimensions:[426,448],format:'NPY'
},function(url,error) {
  if (error) print('EXPORT_ERROR',error);
  else print(ui.Label('Download S2-20240915-utm10',{color:'#1565c0'},url));
});
print('Exact scene',source.get('system:index'),'10 m output grid; SWIR/SCL native 20 m; not measured flood depth.');
