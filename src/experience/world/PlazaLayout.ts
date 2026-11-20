import { Vector3 } from "@babylonjs/core";

/** Fixed coordinates of the plaza (metres). The visitor enters from the south and looks north. */
export class PlazaLayout {
  static readonly fountain = new Vector3(0, 0, 6);
  static readonly kiosk = new Vector3(0, 0, -14);
  /** The cashier's stall ("Caja"), facing the center. */
  static readonly cashier = new Vector3(-18, 0, -15);
  /** The commissions hall, in the free south-east corner (out of the salas' and paths' way), facing the center. */
  static readonly commissionHall = new Vector3(40, 0, -40);
  /** The auction hall, symmetric to the commissions hall in the free south-west corner. */
  static readonly auctionHall = new Vector3(-40, 0, -40);
  static readonly center = new Vector3(0, 0, 0);
  static readonly spawn = new Vector3(0, 0, -52);
  /** Perimeter wall half-size and half width of the entrance gap. */
  static readonly wallHalf = 62;
  static readonly gateHalf = 4;
  /** Central paved square. */
  static readonly pavingWidth = 56;
  static readonly pavingDepth = 50;
}
