"""Minimum river rise that crosses the lowest available connected terrain path."""
import heapq
import numpy as np


def minimum_connected_rise(ground, reference, river, valid):
    required = np.maximum(0, np.round(ground-reference, 2))
    threshold = np.full(ground.shape, np.inf)
    queue = []
    for r,c in zip(*np.where(river & valid)):
        threshold[r,c] = 0
        heapq.heappush(queue,(0,int(r),int(c)))
    h,w = ground.shape
    while queue:
        cost,r,c = heapq.heappop(queue)
        if cost != threshold[r,c]:
            continue
        for nr,nc in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)]:
            if 0 <= nr < h and 0 <= nc < w and valid[nr,nc]:
                candidate = max(cost,float(required[nr,nc]))
                if candidate < threshold[nr,nc]:
                    threshold[nr,nc] = candidate
                    heapq.heappush(queue,(candidate,nr,nc))
    return threshold
