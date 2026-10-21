export type MyMapsRecord = {
  id: string; latitude: number; longitude: number; status: string; color: string; fields: Record<string,string>
}
export type MyMapsLayer = {
  id: string; label: string; records: MyMapsRecord[]; legend: Array<{ label:string; color:string; rows:number }>
}
export type MyMapsReview = {
  visibility:'local-review-only'; sourceUrl:string; title:string; surveyDate:null; importedAt:string
  sourceRowsPerLayer:number; distinctCoordinates:number; layers:MyMapsLayer[]
}
