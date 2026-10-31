"""Labelled before/peak/extent sheets from thaton-flood-event-composites.mjs output; no new analysis."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.image import imread
from matplotlib.patches import Patch

ROOT = Path(__file__).resolve().parents[1]/'KokData/thaton-flood-events-2022-2026'
plt.rcParams['font.family'] = 'Tahoma'
PANELS = [('01_before_cloudfree.png', 'ก่อนเกิดเหตุ (ไร้เมฆ)'),
          ('02_peak_cloudfree.png', 'ช่วงน้ำท่วมมากที่สุด (ไร้เมฆ)'),
          ('03_peak_with_max_flood_extent.png', 'พื้นที่น้ำท่วมสูงสุดของเหตุการณ์')]
LEGEND = [Patch(color='#e53935', label='พื้นที่น้ำท่วม (รวมทุกภาพในเหตุการณ์)'),
          Patch(color='#1e88e5', label='แม่น้ำ/แหล่งน้ำปกติ')]


def caption(event):
    if not event['detected']:
        return f"{event['label']} — ไม่พบน้ำท่วมเกินเกณฑ์ในภาพดาวเทียม"
    peak = event['peak']
    return (f"{event['label']} | เห็นน้ำท่วมจากดาวเทียม {event['floodFirstObserved'][:10]} ถึง {event['floodLastObserved'][:10]}"
            f" | พีค {peak['dateBangkok']} ({'Sentinel-1' if peak['sensor'] == 'S1' else 'Sentinel-2'})"
            f" | พื้นที่ท่วมสูงสุด {event['maxExtentKm2']:.3f} ตร.กม. (~{event['maxExtentRai']:.0f} ไร่)")


def sheet(event, path):
    folder = ROOT/event['id']
    panels = [(name, title) for name, title in PANELS if (folder/name).exists()]
    fig, axes = plt.subplots(1, len(panels), figsize=(6*len(panels), 6.9), layout='constrained')
    for ax, (name, title) in zip(axes, panels):
        ax.imshow(imread(folder/name)); ax.set_title(title, fontsize=14); ax.axis('off')
    if event['detected']:
        axes[-1].legend(handles=LEGEND, loc='lower left', fontsize=10, framealpha=.9)
    fig.suptitle(caption(event), fontsize=13)
    fig.savefig(path, dpi=110); plt.close(fig)


events = json.loads((ROOT/'events.json').read_text(encoding='utf-8'))['events']
for event in events:
    sheet(event, ROOT/event['id']/'00_summary.png')
detected = [e for e in events if e['detected']]
fig, axes = plt.subplots(len(detected), 3, figsize=(15, 5.2*len(detected)), layout='constrained')
for row, event in zip(axes, detected):
    for ax, (name, title) in zip(row, PANELS):
        ax.imshow(imread(ROOT/event['id']/name)); ax.axis('off')
        ax.set_title(f"{title}" if ax is not row[0] else f"{event['label']}\n{title}", fontsize=12)
    row[2].text(0.01, 0.01, f"พีค {event['peak']['dateBangkok'][:10]} | {event['maxExtentKm2']:.3f} ตร.กม.",
                transform=row[2].transAxes, fontsize=11, color='white', bbox={'facecolor': 'black', 'alpha': .6})
fig.legend(handles=LEGEND, loc='upper right', fontsize=11)
fig.savefig(ROOT/'SUMMARY_all_events.png', dpi=80); plt.close(fig)
print(f'{len(events)} event sheets, {len(detected)} in summary')
