// Export public observations on the EXACT simulation grid; no asset/Drive writes.
var transform = [1/3600,0,99.34458333333333,0,-1/3600,20.08013888888889];
var aoi = ee.Geometry.Rectangle([99.34458333333333,20.03986111111111,99.38513888888889,20.08013888888889],null,false);
var options = {crs:'EPSG:4326',crs_transform:transform,dimensions:[146,145],format:'NPY'};
function download(key,image) {
  image.toDouble().unmask(-9999).getDownloadURL(options,function(url,error) {
    if (error) print('EXPORT_ERROR '+key,error);
    else print(ui.Label('Download '+key,{color:'#1565c0'},url));
  });
}
var ids = [
  ['S2-20240905','20240905T034539_20240905T035823_T47QNC'],
  ['S2-20240910','20240910T034531_20240910T035933_T47QNC'],
  ['S2-20240915','20240915T034529_20240915T035607_T47QNC']
];
ids.forEach(function(entry) {
  var image = ee.Image('COPERNICUS/S2_SR_HARMONIZED/'+entry[1]);
  var output = image.select(['B4','B3','B2','B8','B11','B12','SCL']).addBands(ee.Image.pixelLonLat());
  download(entry[0],output);
  Map.addLayer(image.clip(aoi),{bands:['B4','B3','B2'],min:0,max:3000,gamma:1.2},entry[0]+' true colour',entry[0]==='S2-20240915');
});
var radarIds = [
  ['S1-20240904-BKK','S1A_IW_GRDH_1SDV_20240903T231600_20240903T231625_055507_06C5C9_72F7'],
  ['S1-20240916-BKK','S1A_IW_GRDH_1SDV_20240915T231601_20240915T231626_055682_06CCBA_08DA']
];
radarIds.forEach(function(entry) {
  var image = ee.Image('COPERNICUS/S1_GRD/'+entry[1]);
  var filtered = image.select(['VV','VH']).focalMedian({radius:20,kernelType:'circle',units:'meters'});
  var output = filtered.addBands(image.select('angle')).addBands(ee.Image.pixelLonLat());
  download(entry[0],output);
  Map.addLayer(filtered.clip(aoi),{bands:['VV'],min:-25,max:0},entry[0]+' VV',false);
});
Map.centerObject(aoi,14);
