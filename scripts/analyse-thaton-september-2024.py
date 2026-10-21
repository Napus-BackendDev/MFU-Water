"""Reproducible satellite/model comparison; no changes to simulation or app data."""
from pathlib import Path
import csv
import hashlib
import json
import math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'KokData/flood-validation-2024-09'
MODEL = ROOT/'KokData/terrain-thaton/flood-grid-audit.npz'
STAGES = [2.5,5.,7.5]
DATES = ['20240905','20240910','20240915']


def divide(a,b):
    return np.divide(a,b,out=np.zeros(a.shape,dtype=float),where=b!=0)


def optical(image,threshold=0):
    valid = np.isin(image['SCL'],[4,5,6])
    mndwi = divide(image['B3']-image['B11'],image['B3']+image['B11'])
    ndvi = divide(image['B8']-image['B4'],image['B8']+image['B4'])
    return valid,valid & (mndwi>threshold) & (ndvi<.3)


def agreement(observed,predicted,valid,areas):
    overlap = float(areas[valid & observed & predicted].sum())
    only_model = float(areas[valid & ~observed & predicted].sum())
    only_satellite = float(areas[valid & observed & ~predicted].sum())
    union = overlap+only_model+only_satellite
    return {'overlapKm2':overlap/1e6,'modelOnlyKm2':only_model/1e6,'satelliteOnlyKm2':only_satellite/1e6,
            'modelAreaKm2':(overlap+only_model)/1e6,'observedAreaKm2':(overlap+only_satellite)/1e6,
            'iou':overlap/union if union else None,
            'observedCoverage':overlap/(overlap+only_satellite) if overlap+only_satellite else None,
            'modelSupportedFraction':overlap/(overlap+only_model) if overlap+only_model else None}


def analyse():
    grid = np.load(MODEL)
    shape = grid['water'].shape
    rows,cols = np.indices(shape)
    west,north,dx,dy = grid['origin']
    longitude,latitude = west+cols*dx,north-rows*dy
    areas = 6371008.8**2*math.radians(dx)*(
        np.sin(np.radians(latitude+dy/2))-np.sin(np.radians(latitude-dy/2)))
    land = grid['water']==0
    observations = {date:np.load(OUT/f'S2-{date}.npy') for date in DATES}
    radar = {date:np.load(OUT/f'S1-{date}-BKK.npy') for date in ['20240904','20240916']}
    for image in [*observations.values(),*radar.values()]:
        assert image.shape==shape
        assert np.allclose(image['longitude'],longitude,atol=1e-10,rtol=0)
        assert np.allclose(image['latitude'],latitude,atol=1e-10,rtol=0)
    clear,water = {},{}
    for date,image in observations.items():
        clear[date],water[date] = optical(image)
    assert not clear['20240910'].any(), 'The missing-date conclusion must be checked against actual pixels'
    common = clear['20240905'] & clear['20240915'] & land
    domain = common & ~water['20240905']
    observed_new = water['20240915'] & domain
    weighted_area = lambda mask: float(areas[mask].sum()/1e6)
    date_comparisons = []
    for date in DATES:
        eligible = clear[date] & land
        for rise in STAGES:
            row = agreement(water[date],grid[f'classes{rise:g}']>0,eligible,areas) if eligible.any() else {
                key:None for key in ['overlapKm2','modelOnlyKm2','satelliteOnlyKm2','modelAreaKm2','observedAreaKm2','iou','observedCoverage','modelSupportedFraction']}
            date_comparisons.append({'date':date,'riseMetres':rise,'domainKm2':weighted_area(eligible),**row})
    metrics = []
    for rise in STAGES:
        predicted = grid[f'classes{rise:g}']>0
        metric = agreement(observed_new,predicted,domain,areas)
        metric.update(riseMetres=rise,fullModelAreaKm2=weighted_area(predicted),
                      domainKm2=weighted_area(domain),comparison='2024-09-15 new water relative to 2024-09-05')
        # Independent count/weighted-cell check, rather than polygon display area.
        assert abs(metric['modelAreaKm2']-weighted_area(predicted & domain))<1e-12
        assert abs(metric['observedAreaKm2']-weighted_area(observed_new))<1e-12
        metrics.append(metric)
    sensitivity = []
    for threshold in [-.05,0,.05]:
        c0,w0 = optical(observations['20240905'],threshold)
        c1,w1 = optical(observations['20240915'],threshold)
        eligible = c0 & c1 & land & ~w0
        for rise in STAGES:
            row = agreement(w1 & eligible,grid[f'classes{rise:g}']>0,eligible,areas)
            sensitivity.append({'mndwiThreshold':threshold,'riseMetres':rise,**row})
    before,after = radar['20240904'],radar['20240916']
    valid_radar = (before['VV']>-100) & (after['VV']>-100) & land
    radar_candidate = valid_radar & (after['VV']<-17) & (after['VV']-before['VV']<-3)
    summary = {
        'status':'exploratory_spatial_comparison_not_calibrated','analysisDate':'2026-10-21',
        'datesTimezone':'Asia/Bangkok','gridShape':list(shape),'gridOrigin':grid['origin'].tolist(),
        'modelAuditSha256':hashlib.sha256(MODEL.read_bytes()).hexdigest(),
        'aoiKm2':weighted_area(np.ones(shape,dtype=bool)),'domainKm2':weighted_area(domain),
        'observationMethod':{'clearSclClasses':[4,5,6],'mndwiThreshold':0,'ndviMaximum':.3,
                             'baseline':'2024-09-05 is a reference, not a verified unflooded date',
                             'target':'new optically detected water on land, excluding baseline water and WBM original water',
                             'reprojection':'nearest sample of source bands to the original 145x146 model grid; no finer terrain inferred'},
        'dates':[{'date':f'{d[:4]}-{d[4:6]}-{d[6:]}','usableFraction':weighted_area(clear[d])/weighted_area(np.ones(shape,dtype=bool)),
                  'usablePixels':int(clear[d].sum()),'waterAreaKm2':weighted_area(water[d]) if clear[d].any() else None,
                  'waterOutsideOriginalMaskKm2':weighted_area(water[d]&land) if clear[d].any() else None,
                  'status':'usable_partial' if clear[d].any() else 'not_observable_clouds'} for d in DATES],
        'metrics':metrics,'dateComparisons':date_comparisons,'thresholdSensitivity':sensitivity,
        'radarSupport':{'baselineBangkok':'2024-09-04','targetBangkok':'2024-09-16','relativeOrbit':135,'pass':'DESCENDING',
                        'filter':'20 m radius median; post VV < -17 dB AND change < -3 dB',
                        'candidateAreaKm2':weighted_area(radar_candidate),'overlapOpticalNewKm2':weighted_area(radar_candidate & observed_new),
                        'interpretation':'supporting change candidate, different dates, not a replacement observation for 10 September'},
        'sourceFiles':[{'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
                       for p in sorted(OUT.glob('*.npy'))],
        'limitations':['Water-index thresholds are uncalibrated and not ground truth.',
                       'Clouds/shadows/no-data are excluded, never treated as dry land.',
                       'SAR dates in Bangkok are 4 and 16 September, not 3 and 15 September UTC.',
                       'Optical imagery cannot verify flood depth or water hidden below vegetation/buildings.',
                       'No measured river-stage series links a date to a model +2.5/+5/+7.5 m scenario.',
                       'IoU is spatial overlap with this candidate mask, not percent model accuracy or flood probability.',
                       'The 5 September reference may already contain inundation; difference masks omit water present in both dates.']
    }
    (OUT/'analysis.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for name,records in [('comparison.csv',metrics),('date-comparisons.csv',date_comparisons),('threshold-sensitivity.csv',sensitivity),('scenes.csv',summary['dates'])]:
        with (OUT/name).open('w',newline='',encoding='utf-8-sig') as stream:
            writer=csv.DictWriter(stream,fieldnames=list(records[0]));writer.writeheader();writer.writerows(records)
    np.savez_compressed(OUT/'comparison-audit.npz',domain=domain,observedNew=observed_new,commonClearLand=common,
                        radarCandidate=radar_candidate,areasM2=areas,**{f'model{rise:g}':grid[f'classes{rise:g}']>0 for rise in STAGES})
    figures(summary,observations,clear,grid,domain,observed_new,radar_candidate)
    return summary


def figures(summary,observations,clear,grid,domain,observed,radar_candidate):
    extent = [99.34458333333333,99.38513888888889,20.03986111111111,20.08013888888889]
    rgb = {date:np.clip(np.stack([a['B4'],a['B3'],a['B2']],axis=-1)/3000,0,1)**(1/1.2)
           for date,a in observations.items()}
    fig,axes = plt.subplots(1,3,figsize=(15,5.3),layout='constrained')
    for ax,date,row in zip(axes,DATES,summary['dates']):
        ax.imshow(rgb[date],extent=extent,interpolation='nearest')
        ax.set_title(f"{row['date']} | clear {row['usableFraction']:.1%}",fontsize=12)
        ax.set_xlabel('Longitude');ax.set_ylabel('Latitude')
        ax.ticklabel_format(useOffset=False)
        if not clear[date].any():
            ax.text(.5,.5,'CLOUDS\nNo valid water observation',transform=ax.transAxes,ha='center',va='center',
                    color='#334155',bbox={'facecolor':'white','alpha':.92,'edgecolor':'none'},fontsize=12)
    fig.suptitle('Thaton | actual Sentinel-2 acquisitions | 30 m comparison grid',fontsize=15)
    fig.savefig(OUT/'observations.png',dpi=160);plt.close(fig)
    colors = {'overlap':'#7c3aed','model':'#f59e0b','satellite':'#06b6d4','excluded':'#64748b'}
    fig,axes = plt.subplots(2,2,figsize=(12,11),layout='constrained')
    for ax,rise,metric in zip(axes.flat,STAGES,summary['metrics']):
        predicted=grid[f'classes{rise:g}']>0
        ax.imshow(rgb['20240915'],extent=extent,interpolation='nearest')
        overlay=np.zeros((*domain.shape,4))
        for mask,color,alpha in [(~domain,colors['excluded'],.55),(domain&observed&~predicted,colors['satellite'],.85),
                                  (domain&predicted&~observed,colors['model'],.6),(domain&predicted&observed,colors['overlap'],.9)]:
            overlay[mask]=[*matplotlib.colors.to_rgb(color),alpha]
        ax.imshow(overlay,extent=extent,interpolation='nearest')
        ax.set_title(f"Model +{rise:g} m | IoU {metric['iou']:.1%}")
        ax.set_xlabel('Longitude');ax.set_ylabel('Latitude');ax.ticklabel_format(useOffset=False)
    ax=axes.flat[3]
    ax.imshow(rgb['20240915'],extent=extent,interpolation='nearest')
    overlay=np.zeros((*domain.shape,4));overlay[radar_candidate]=[*matplotlib.colors.to_rgb('#ef4444'),.8]
    ax.imshow(overlay,extent=extent,interpolation='nearest')
    ax.set_title('SAR change candidate | 4 to 16 Sep (Bangkok)')
    ax.set_xlabel('Longitude');ax.set_ylabel('Latitude');ax.ticklabel_format(useOffset=False)
    fig.legend(handles=[Patch(color=colors['overlap'],label='Both'),Patch(color=colors['satellite'],label='Satellite only'),
                        Patch(color=colors['model'],label='Model only'),Patch(color=colors['excluded'],label='Excluded / not compared'),
                        Patch(color='#ef4444',label='SAR candidate, different dates')],loc='outside lower center',ncol=3,fontsize=10)
    fig.suptitle('15 Sep new-water candidate vs model | reference: 5 Sep\nIoU is overlap, NOT calibrated model accuracy',fontsize=14)
    fig.savefig(OUT/'comparison.png',dpi=160);plt.close(fig)


if __name__=='__main__':
    result=analyse()
    print(json.dumps({'dates':result['dates'],'modelOverlap':result['metrics'],'radarSupport':result['radarSupport']}))
