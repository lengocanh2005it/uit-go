import { Injectable } from '@nestjs/common';
import { S2CellId, S2LatLng } from 'nodes2ts';

@Injectable()
export class S2Service {
  constructor() {}

  getCellId(lat: number, lng: number): string {
    const latLng = S2LatLng.fromDegrees(lat, lng);
    const point = latLng.toPoint();
    const cellId = S2CellId.fromPoint(point);
    return cellId.toToken();
  }

  computeDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const p1 = S2LatLng.fromDegrees(lat1, lng1);
    const p2 = S2LatLng.fromDegrees(lat2, lng2);
    const radians = p1.getDistance(p2).radians;
    return radians * 6371000;
  }

  getNeighbors(cellToken: string): string[] {
    const cell = S2CellId.fromToken(cellToken);
    return cell.getAllNeighbors(cell.level()).map((c) => c.toToken());
  }

  getKRing(cellToken: string, k = 1): string[] {
    const visited = new Set<string>();
    let frontier = new Set([cellToken]);
    visited.add(cellToken);

    for (let i = 0; i < k; i++) {
      const next = new Set<string>();
      for (const token of frontier) {
        const neighbors = this.getNeighbors(token);
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            next.add(n);
          }
        }
      }
      frontier = next;
    }
    return Array.from(visited);
  }

  pointInCell(lat: number, lng: number, cellToken: string): boolean {
    const cell = S2CellId.fromToken(cellToken);
    const pointCell = S2CellId.fromPoint(
      S2LatLng.fromDegrees(lat, lng).toPoint(),
    );
    const minId = cell.rangeMin().id;
    const maxId = cell.rangeMax().id;
    const pointId = pointCell.id;
    return pointId.greaterThanOrEqual(minId) && pointId.lessThanOrEqual(maxId);
  }

  getCoveringCells(
    lat: number,
    lng: number,
    radiusMeters: number,
    approxCellSize = 500,
  ): string[] {
    const centerCell = this.getCellId(lat, lng);
    const k = Math.ceil(radiusMeters / approxCellSize);
    return this.getKRing(centerCell, k);
  }
}
