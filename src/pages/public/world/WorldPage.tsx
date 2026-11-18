import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState, ErrorNote, Loading } from "../../../components/Feedback";
import { Icon } from "../../../components/Icon";
import { useAsync } from "../../../hooks/useAsync";
import { useLocale } from "../../../state/LocaleContext";
import { useSession } from "../../../state/SessionContext";
import { DoorInteractable, KioskInteractable, PieceInteractable, type Interactable } from "../../../experience/world/Interactable";
import { World } from "../../../experience/world/World";
import type { CameraMode } from "../../../experience/world/WorldTypes";
import { PiecePanel } from "./PiecePanel";
import { WorldRoomsLoader, type WorldData } from "../../../experience/world/WorldRoomsLoader";

/** The gallery: a 3D plaza with one sala per master, where every piece is a photo inside a glass case. */
export function WorldPage() {
  const { i18n, format, language } = useLocale();
  const { user } = useSession();
  const touchOnly = useMemo(() => window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches, []);
  const data = useAsync(() => new WorldRoomsLoader(i18n, format).load(user), [language, user?.id]);

  if (touchOnly) {
    return (
      <div className="container narrow">
        <EmptyState
          title={i18n.t("world.mobileTitle")}
          text={i18n.t("world.mobileText")}
          action={
            <Link className="btn btn-primary" to="/stores">
              {i18n.t("world.seeStores")}
            </Link>
          }
        />
      </div>
    );
  }
  if (data.error !== null) return <div className="container"><ErrorNote error={data.error} /></div>;
  if (!data.data) return <Loading label={i18n.t("world.loading")} />;
  if (!data.data.rooms.length) return <div className="container narrow"><EmptyState title={i18n.t("world.empty")} text={i18n.t("world.emptyText")} /></div>;
  // A new language rebuilds the world, so signs and plaques are painted again.
  return <WorldStage key={language} data={data.data} />;
}

function WorldStage({ data }: { data: WorldData }) {
  const { i18n } = useLocale();
  const navigate = useNavigate();
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const [height, setHeight] = useState(600);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [mode, setMode] = useState<CameraMode>("THIRD_PERSON");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [panelSlug, setPanelSlug] = useState<string | null>(null);

  // The stage fills the window below the site header.
  useLayoutEffect(() => {
    const measure = () => setHeight(window.innerHeight - (document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const promptFor = useCallback(
    (item: Interactable | null): string | null => {
      if (item instanceof KioskInteractable) return i18n.t("world.promptKiosk");
      if (item instanceof PieceInteractable) return i18n.t("world.promptPiece", { title: item.vitrina.piece.title });
      if (item instanceof DoorInteractable) {
        const { room } = item.sala;
        const text = i18n.t("world.promptDoor", { name: room.masterName, count: room.pieces.length });
        return room.recommended ? `${text} · ★ ${i18n.t("world.recommended")}` : text;
      }
      return null;
    },
    [i18n],
  );

  useEffect(() => {
    if (!canvas.current) return;
    let instance: World;
    try {
      instance = new World(canvas.current, data.rooms, new URLSearchParams(window.location.search).get("quality"));
    } catch {
      setFailed(true);
      return;
    }
    world.current = instance;
    setMode(instance.cameraMode);
    const unsubscribe = [
      instance.interactions.nearbyChanged.subscribe((item) => setPrompt(promptFor(item))),
      instance.input.pointerLockChanged.subscribe(setLocked),
      instance.player.modeChanged.subscribe(setMode),
      instance.kioskUsed.subscribe(() => navigate("/welcome")),
      instance.pieceSelected.subscribe((piece) => {
        instance.setPlaying(false);
        setPanelSlug(data.slugs.get(piece.id) ?? piece.slug);
      }),
    ];
    if (new URLSearchParams(window.location.search).has("debug")) (window as unknown as { museo?: World }).museo = instance;
    return () => {
      unsubscribe.forEach((stop) => stop());
      instance.dispose();
      world.current = null;
    };
  }, [data, navigate, promptFor]);

  const enter = () => {
    setStarted(true);
    world.current?.setPlaying(true);
    world.current?.input.requestPointerLock();
    canvas.current?.focus();
  };

  const closePanel = useCallback(() => {
    setPanelSlug(null);
    world.current?.setPlaying(true);
    canvas.current?.focus();
  }, []);

  const showControls = () => {
    world.current?.setPlaying(false);
    setStarted(false);
  };

  return (
    <div className="world-stage" style={{ height: Math.max(420, height) }}>
      <canvas ref={canvas} className="world-canvas" tabIndex={0} aria-label={i18n.t("world.title")} />
      {failed && (
        <div className="world-overlay">
          <div className="world-card">
            <p>{i18n.t("world.noWebgl")}</p>
            <Link className="btn btn-primary" to="/stores">
              {i18n.t("world.seeStores")}
            </Link>
          </div>
        </div>
      )}

      {!failed && !started && (
        <div className="world-overlay">
          <div className="world-card">
            <h1>{i18n.t("world.introTitle")}</h1>
            <p>{i18n.t("world.introText")}</p>
            <h2 className="h3">{i18n.t("world.controls")}</h2>
            <dl className="world-keys">
              <dt><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></dt>
              <dd>{i18n.t("world.control.move")}</dd>
              <dt><kbd>Shift</kbd></dt>
              <dd>{i18n.t("world.control.run")}</dd>
              <dt><kbd>Mouse</kbd></dt>
              <dd>{i18n.t("world.control.look")}</dd>
              <dt><kbd>E</kbd></dt>
              <dd>{i18n.t("world.control.use")}</dd>
              <dt><kbd>V</kbd></dt>
              <dd>{i18n.t("world.control.camera")}</dd>
              <dt>{i18n.t("world.control.pieceKey")}</dt>
              <dd>{i18n.t("world.control.piece")}</dd>
            </dl>
            <button type="button" className="btn btn-primary btn-large" onClick={enter}>
              {i18n.t("world.enter")}
            </button>
          </div>
        </div>
      )}

      {started && !panelSlug && (
        <>
          {locked && mode === "FIRST_PERSON" && <span className="world-crosshair" aria-hidden="true" />}
          {prompt && (
            <p className="world-prompt" role="status">
              {prompt}
            </p>
          )}
          {!locked && <p className="world-hint">{i18n.t("world.clickToLook")}</p>}
          <div className="world-tools">
            <button type="button" className="btn btn-quiet" onClick={() => world.current?.player.toggleMode()} title={i18n.t("world.cameraToggle")}>
              <Icon name="eye" size={16} /> {mode === "FIRST_PERSON" ? i18n.t("world.cameraFirst") : i18n.t("world.cameraThird")}
            </button>
            <button type="button" className="btn btn-quiet" onClick={showControls}>
              {i18n.t("world.showControls")}
            </button>
          </div>
        </>
      )}

      {panelSlug && <PiecePanel slug={panelSlug} onClose={closePanel} />}
    </div>
  );
}
