import { Color3, Mesh, MeshBuilder, PBRMaterial, TransformNode, Vector3, type Scene } from "@babylonjs/core";
import type { MaterialLibrary } from "../world/MaterialLibrary";
import { MeshFactory } from "../world/MeshFactory";
import type { ShadowRig } from "../world/ShadowRig";

/**
 * The round entrance hall of the museum: plaster wall, dome, the big doors to the plaza with the
 * "MUSEO · Barniz de Pasto" sign above them, and the ticket office. The doors face +z.
 */
export class LobbyHall {
  static readonly RADIUS = 10;
  static readonly WALL_HEIGHT = 7;
  /** Where the doors are (centre of the opening, on the floor). */
  static readonly DOORS = new Vector3(0, 0, 9.6);
  /** Front of the ticket office counter, where the visitor stands. */
  static readonly TICKET_OFFICE = new Vector3(6.6, 0, 2.6);

  private static readonly SEGMENTS = 24;
  private static readonly OPEN_SECONDS = 1.6;
  private static readonly OPEN_ANGLE = 1.45;

  private readonly hinges: TransformNode[] = [];
  private doorProgress = 0;
  private opening = false;

  constructor(
    private readonly scene: Scene,
    private readonly materials: MaterialLibrary,
    private readonly shadows: ShadowRig,
  ) {}

  build(): void {
    this.buildFloorAndDome();
    this.buildWall();
    this.buildDoors();
    this.buildColumns();
    this.buildTicketOffice();
    this.buildOutside();
  }

  /** Starts swinging the doors open towards the plaza. */
  openDoors(): void {
    this.opening = true;
  }

  update(deltaSeconds: number): void {
    if (!this.opening || this.doorProgress >= 1) return;
    this.doorProgress = Math.min(1, this.doorProgress + deltaSeconds / LobbyHall.OPEN_SECONDS);
    const eased = 1 - Math.pow(1 - this.doorProgress, 3);
    const angle = eased * LobbyHall.OPEN_ANGLE;
    this.hinges[0].rotation.y = -angle;
    this.hinges[1].rotation.y = angle;
  }

  // ---------------------------------------------------------------- parts

  private buildFloorAndDome(): void {
    const m = this.materials;
    const floor = MeshBuilder.CreateDisc("lobbyFloor", { radius: LobbyHall.RADIUS + 0.3, tessellation: 64 }, this.scene);
    floor.rotation.x = Math.PI / 2;
    floor.material = m.limestone;
    m.tile(m.limestone, 6, 6);
    this.receive(floor);

    // Inlaid red and brass rings that frame the pedestals.
    for (const [radius, thickness, material, y] of [
      [3.2, 0.12, m.brass, 0.006],
      [6.9, 0.5, m.paintRed, 0.004],
      [7.3, 0.08, m.brass, 0.006],
    ] as const) {
      const ring = MeshBuilder.CreateTorus("floorRing", { diameter: radius * 2, thickness, tessellation: 96 }, this.scene);
      ring.scaling.y = 0.02;
      ring.position.y = y;
      ring.material = material;
      this.receive(ring);
    }

    const dome = MeshBuilder.CreateSphere("lobbyDome", { diameter: LobbyHall.RADIUS * 2, segments: 32, slice: 0.5, sideOrientation: Mesh.BACKSIDE }, this.scene);
    dome.position.y = LobbyHall.WALL_HEIGHT;
    dome.material = m.plaster;
    dome.isPickable = false;

    // Oculus: the round skylight at the top of the dome.
    const oculus = MeshBuilder.CreateDisc("oculus", { radius: 1.6, tessellation: 48 }, this.scene);
    oculus.rotation.x = -Math.PI / 2;
    oculus.position.y = LobbyHall.WALL_HEIGHT + LobbyHall.RADIUS - 0.25;
    oculus.material = m.glowLamp;
    oculus.isPickable = false;

    const cornice = MeshBuilder.CreateTorus("cornice", { diameter: LobbyHall.RADIUS * 2 - 0.3, thickness: 0.35, tessellation: 96 }, this.scene);
    cornice.position.y = LobbyHall.WALL_HEIGHT;
    cornice.material = m.woodDark;
    cornice.isPickable = false;
  }

  /** A ring of wall segments with a gap at +z for the doors. */
  private buildWall(): void {
    const m = this.materials;
    const count = LobbyHall.SEGMENTS;
    const radius = LobbyHall.RADIUS + 0.2;
    const width = 2 * Math.PI * radius / count + 0.06;
    for (let i = 0; i < count; i++) {
      if (i === 0 || i === count - 1) continue;
      const angle = ((i + 0.5) / count) * Math.PI * 2;
      const wall = MeshFactory.box(this.scene, "lobbyWall", width, LobbyHall.WALL_HEIGHT, 0.4, m.plaster, 2);
      wall.position.set(Math.sin(angle) * radius, LobbyHall.WALL_HEIGHT / 2, Math.cos(angle) * radius);
      wall.rotation.y = angle;
      this.receive(wall);
      // Dark wooden wainscot along the bottom of the wall.
      const wainscot = MeshFactory.box(this.scene, "wainscot", width, 1.1, 0.1, m.woodDark, 2);
      wainscot.position.set(Math.sin(angle) * (radius - 0.24), 0.55, Math.cos(angle) * (radius - 0.24));
      wainscot.rotation.y = angle;
      this.receive(wainscot);
    }
  }

  private buildDoors(): void {
    const m = this.materials;
    const { z } = LobbyHall.DOORS;
    const doorHeight = 4.6;
    const leafWidth = 2.3;

    // Stone frame and the wall over the opening.
    for (const side of [-1, 1]) {
      const post = MeshFactory.box(this.scene, "doorPost", 0.45, doorHeight + 0.5, 0.7, m.limestone, 1);
      post.position.set(side * 2.55, (doorHeight + 0.5) / 2, z);
      this.cast(post);
    }
    const lintel = MeshFactory.box(this.scene, "lintel", 5.6, 0.5, 0.7, m.limestone, 1);
    lintel.position.set(0, doorHeight + 0.25, z);
    this.cast(lintel);
    const over = MeshFactory.box(this.scene, "overDoor", 5.6, LobbyHall.WALL_HEIGHT - doorHeight - 0.5, 0.4, m.plaster, 2);
    over.position.set(0, doorHeight + 0.5 + over.getBoundingInfo().boundingBox.extendSize.y, z + 0.1);
    this.receive(over);

    // Two leaves on hinges at the sides; they swing out towards the plaza.
    for (const side of [-1, 1]) {
      const hinge = new TransformNode(`doorHinge${side}`, this.scene);
      hinge.position.set(side * leafWidth, 0, z);
      this.hinges.push(hinge);
      const leaf = MeshFactory.box(this.scene, "doorLeaf", leafWidth, doorHeight, 0.14, m.woodWarm, 1.5);
      leaf.parent = hinge;
      leaf.position.set(-side * leafWidth / 2, doorHeight / 2, 0);
      this.cast(leaf);
      // Carved panels and a brass ring handle on each leaf.
      for (const panelY of [1.2, 3.2]) {
        const panel = MeshFactory.box(this.scene, "doorPanel", leafWidth * 0.66, 1.4, 0.05, m.woodDark, 1.5);
        panel.parent = hinge;
        panel.position.set(-side * leafWidth / 2, panelY, -0.09);
      }
      const handle = MeshBuilder.CreateTorus("doorHandle", { diameter: 0.24, thickness: 0.035, tessellation: 20 }, this.scene);
      handle.material = m.brass;
      handle.parent = hinge;
      handle.rotation.x = Math.PI / 2;
      handle.position.set(-side * (leafWidth - 0.3), 2.1, -0.12);
    }

    // The sign over the doors.
    const sign = MeshBuilder.CreatePlane("lobbySign", { width: 5.2, height: 1.3 }, this.scene);
    sign.material = m.signBoard(["MUSEO", "Barniz de Pasto"], 1024, 256);
    sign.position.set(0, doorHeight + 1.25, z - 0.25);
    sign.isPickable = false;
  }

  private buildColumns(): void {
    const m = this.materials;
    for (let i = 0; i < 10; i++) {
      const angle = ((i + 0.5) / 10) * Math.PI * 2 + Math.PI / 10;
      // Leave free the doors (+z) and the ticket office (east).
      const x = Math.sin(angle) * 9.1;
      const z = Math.cos(angle) * 9.1;
      if (z > 7 || (x > 5 && z > -1 && z < 6)) continue;
      const shaft = MeshBuilder.CreateCylinder("column", { diameter: 0.6, height: LobbyHall.WALL_HEIGHT - 0.6, tessellation: 24 }, this.scene);
      shaft.material = m.limestone;
      shaft.position.set(x, LobbyHall.WALL_HEIGHT / 2, z);
      this.cast(shaft);
      for (const y of [0.15, LobbyHall.WALL_HEIGHT - 0.15]) {
        const block = MeshFactory.box(this.scene, "columnBlock", 0.85, 0.3, 0.85, m.limestone, 1);
        block.position.set(x, y, z);
        this.receive(block);
      }
    }
  }

  private buildTicketOffice(): void {
    const m = this.materials;
    const root = new TransformNode("ticketOffice", this.scene);
    const spot = LobbyHall.TICKET_OFFICE;
    root.position.set(spot.x + 1, 0, spot.z + 0.4);
    // It faces the centre of the hall.
    root.rotation.y = Math.atan2(-root.position.x, -root.position.z);

    const counter = MeshFactory.box(this.scene, "ticketCounter", 3.2, 1.15, 0.9, m.woodWarm, 1.5);
    counter.parent = root;
    counter.position.set(0, 0.575, 0);
    this.cast(counter);
    const top = MeshFactory.box(this.scene, "ticketCounterTop", 3.4, 0.08, 1.1, m.woodDark, 1.5);
    top.parent = root;
    top.position.set(0, 1.19, 0);
    this.cast(top);
    const back = MeshFactory.box(this.scene, "ticketBack", 3.4, 3.2, 0.12, m.paintRed);
    back.parent = root;
    back.position.set(0, 1.6, 1.1);
    this.receive(back);
    for (const side of [-1, 1]) {
      const post = MeshFactory.box(this.scene, "ticketPost", 0.16, 3.4, 0.16, m.woodDark, 1);
      post.parent = root;
      post.position.set(side * 1.6, 1.7, 0.5);
      this.cast(post);
    }
    const lamp = MeshBuilder.CreateSphere("ticketLamp", { diameter: 0.28, segments: 12 }, this.scene);
    lamp.material = m.glowLamp;
    lamp.parent = root;
    lamp.position.set(0, 2.9, 0.4);
    const sign = MeshBuilder.CreatePlane("ticketSign", { width: 2.4, height: 0.6 }, this.scene);
    sign.material = m.signBoard(["TAQUILLA · TICKETS"], 768, 192);
    sign.parent = root;
    sign.position.set(0, 3.45, 0.45);
    sign.isPickable = false;
  }

  /** Daylight beyond the doors: what the visitor sees when they open. */
  private buildOutside(): void {
    const { z } = LobbyHall.DOORS;
    const ground = MeshBuilder.CreateGround("outsideGround", { width: 24, height: 14 }, this.scene);
    ground.position.set(0, -0.01, z + 7);
    ground.material = this.materials.cobble;
    this.materials.tile(this.materials.cobble, 8, 5);

    const daylight = new PBRMaterial("daylight", this.scene);
    daylight.albedoColor = Color3.Black();
    daylight.emissiveColor = Color3.FromHexString("#fff1d6");
    daylight.disableLighting = true;
    const sky = MeshBuilder.CreatePlane("outsideLight", { width: 30, height: 16 }, this.scene);
    sky.material = daylight;
    sky.position.set(0, 7, z + 12);
    sky.isPickable = false;
  }

  private cast(mesh: Mesh): Mesh {
    mesh.isPickable = false;
    this.shadows.addCaster(mesh);
    this.shadows.receive(mesh);
    return mesh;
  }

  private receive(mesh: Mesh): Mesh {
    mesh.isPickable = false;
    this.shadows.receive(mesh);
    return mesh;
  }
}
