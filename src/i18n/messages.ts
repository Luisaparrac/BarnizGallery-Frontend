import { adminArea } from "./messages/adminArea";
import { artisanArea } from "./messages/artisanArea";
import { common } from "./messages/common";
import { customerArea } from "./messages/customerArea";
import { experience } from "./messages/experience";
import { publicArea } from "./messages/publicArea";
import { status } from "./messages/status";

const es = { ...common.es, ...status.es, ...publicArea.es, ...customerArea.es, ...artisanArea.es, ...adminArea.es, ...experience.es };

/** Every Spanish key must exist in English too: the compiler checks it. */
const en: Record<keyof typeof es, string> = { ...common.en, ...status.en, ...publicArea.en, ...customerArea.en, ...artisanArea.en, ...adminArea.en, ...experience.en };

export const messages = { es, en };
