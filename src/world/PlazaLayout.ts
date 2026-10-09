import { Vector3 } from "@babylonjs/core";

/** Fixed coordinates of the plaza (metres). The visitor enters from the south and looks north. */
export class PlazaLayout {
  static readonly fountain = new Vector3(0, 0, 6);
  static readonly kiosk = new Vector3(0, 0, -14);
  /** Where the visitor stands to talk to the kiosk. */
  static readonly kioskPoint = new Vector3(0, 0, -17.5);
  static readonly spawn = new Vector3(0, 0, -52);
  /** Perimeter wall half-size and half width of the entrance gap. */
  static readonly wallHalf = 62;
  static readonly gateHalf = 4;
  /** Central paved square. */
  static readonly pavingWidth = 56;
  static readonly pavingDepth = 50;
}
