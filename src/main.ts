import "./style.css";
import { Application } from "./app/Application";

const canvas = document.getElementById("world") as HTMLCanvasElement;
const hudRoot = document.getElementById("hud") as HTMLElement;

new Application(canvas, hudRoot).start();
