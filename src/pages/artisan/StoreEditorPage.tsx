import { useEffect, useState } from "react";
import { ArtImage } from "../../components/ArtImage";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { Field } from "../../components/Field";
import { Icon } from "../../components/Icon";
import { ImageUploadButton } from "../../components/ImageUploadButton";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { StoreRenderer } from "../../components/StoreRenderer";
import { TemplatePreview } from "../../components/TemplatePreview";
import type { SectionType } from "../../domain/catalog";
import type { ArtworkSummary, Master, Store, StoreSection } from "../../domain/gallery";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

type Tab = "template" | "sections" | "info";
const SECTION_TYPES: SectionType[] = ["COVER", "STORY", "TECHNIQUE", "WORKSHOP", "GALLERY", "CATALOG", "FEATURED", "AUCTIONS", "CUSTOM_ORDERS", "CONTACT", "FREE_TEXT"];
const TEXT_SECTIONS: SectionType[] = ["COVER", "STORY", "TECHNIQUE", "WORKSHOP", "CUSTOM_ORDERS", "CONTACT", "FREE_TEXT"];

/** The artisan builds the store: template, theme, sections (edit, hide, reorder) and data, with a live preview. */
export function StoreEditorPage() {
  const { i18n } = useLocale();
  const { catalogs, template } = useCatalogs();
  const toast = useToast();
  const errorText = useErrorText();
  const data = useAsync(async () => {
    const [store, master, artworks] = await Promise.all([services.artisan.getMyStore(), services.artisan.getMyMaster(), services.artisan.listMyArtworks()]);
    return { store, master, artworks };
  }, []);
  const [store, setStore] = useState<Store | null>(null);
  const [master, setMaster] = useState<Master | null>(null);
  const [tab, setTab] = useState<Tab>("sections");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data.data) {
      setStore(data.data.store);
      setMaster(data.data.master);
    }
  }, [data.data]);

  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !store || !master) return <ErrorNote error={data.error} />;

  const edit = (patch: Partial<Store>) => {
    setStore({ ...store, ...patch });
    setDirty(true);
  };
  const editSection = (id: number, patch: Partial<StoreSection>) => edit({ sections: store.sections.map((section) => (section.id === id ? { ...section, ...patch } : section)) });
  const ordered = [...store.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const move = (index: number, delta: number) => {
    const next = [...ordered];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    edit({ sections: next.map((section, position) => ({ ...section, sortOrder: position })) });
  };
  const addSection = (type: SectionType) =>
    edit({ sections: [...ordered, { id: 0 - Date.now(), type, titleEs: "", titleEn: "", contentEs: "", contentEn: "", imageUrl: null, sortOrder: ordered.length, isVisible: true }] });

  const save = async () => {
    setBusy(true);
    try {
      const [savedStore, savedMaster] = await Promise.all([
        services.artisan.saveMyStore({ ...store, sections: store.sections.map((section) => (section.id < 0 ? { ...section, id: 0 } : section)) }),
        services.artisan.updateMyMaster(master),
      ]);
      setStore(savedStore);
      setMaster(savedMaster);
      setDirty(false);
      toast.show(i18n.t("storeEditor.saved"), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const publish = async (on: boolean) => {
    setBusy(true);
    try {
      if (dirty) await save();
      setStore(on ? await services.artisan.publishStore() : await services.artisan.unpublishStore());
      toast.show(on ? i18n.t("storeEditor.publishedToast") : i18n.t("storeEditor.unpublishedToast"), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const applyTemplate = async (templateId: number) => {
    if (!window.confirm(i18n.t("storeEditor.templateConfirm"))) return;
    setBusy(true);
    try {
      setStore(await services.artisan.applyTemplate(templateId));
      setDirty(false);
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const tpl = template(store.templateId);
  const theme = { ...tpl?.defaultTheme, ...store.theme };
  const previewArtworks: ArtworkSummary[] = data.data!.artworks
    .filter((artwork) => artwork.status !== "DRAFT" && artwork.status !== "ARCHIVED")
    .map((artwork) => ({ artwork, storeSlug: store.slug, storeNameEs: store.nameEs, storeNameEn: store.nameEn, masterId: master.id, masterName: master.name, favoriteCount: 0 }));

  return (
    <>
      <PageHeader
        title={i18n.t("storeEditor.title")}
        lead={
          <>
            <StatusBadge kind="store" value={store.status} />
          </>
        }
        actions={
          <>
            <button type="button" className="btn btn-quiet" disabled={busy || !dirty} onClick={() => void save()}>
              {i18n.t("common.save")}
            </button>
            {store.status === "PUBLISHED" ? (
              <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void publish(false)}>
                {i18n.t("storeEditor.unpublish")}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={busy || store.status === "SUSPENDED"} onClick={() => void publish(true)}>
                {i18n.t("storeEditor.publish")}
              </button>
            )}
          </>
        }
      />
      {master.verificationStatus !== "APPROVED" && <Note tone="warn">{i18n.t("storeEditor.needsApproval")}</Note>}
      {store.status === "SUSPENDED" && <Note tone="error">{i18n.t("storeEditor.suspended")}</Note>}
      <div className="editor">
        <div className="editor-form">
          <div className="tabs" role="tablist">
            {(["sections", "template", "info"] as Tab[]).map((name) => (
              <button key={name} role="tab" aria-selected={tab === name} className={tab === name ? "is-on" : ""} onClick={() => setTab(name)}>
                {i18n.tx(`storeEditor.tab.${name}`)}
              </button>
            ))}
          </div>

          {tab === "template" && (
            <>
              <div className="template-grid">
                {catalogs?.templates
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <div key={item.id} className={`template-card${item.id === store.templateId ? " is-on" : ""}`}>
                      <TemplatePreview template={item} />
                      <strong>{i18n.name(item)}</strong>
                      <p className="muted">{i18n.pick(item.descriptionEs, item.descriptionEn)}</p>
                      {item.id === store.templateId ? (
                        <span className="badge badge-good">{i18n.t("storeEditor.current")}</span>
                      ) : (
                        <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void applyTemplate(item.id)}>
                          {i18n.t("storeEditor.useTemplate")}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
              <h2 className="h3">{i18n.t("storeEditor.theme")}</h2>
              <div className="form-grid two">
                {(["primary", "accent", "background"] as const).map((key) => (
                  <Field key={key} label={i18n.tx(`storeEditor.color.${key}`)}>
                    <input type="color" value={theme[key] ?? "#000000"} onChange={(event) => edit({ theme: { ...store.theme, [key]: event.target.value } })} />
                  </Field>
                ))}
                <Field label={i18n.t("storeEditor.font")}>
                  <select value={theme.font ?? "sans"} onChange={(event) => edit({ theme: { ...store.theme, font: event.target.value } })}>
                    <option value="sans">{i18n.t("storeEditor.fontSans")}</option>
                    <option value="serif">{i18n.t("storeEditor.fontSerif")}</option>
                  </select>
                </Field>
              </div>
              {Object.keys(store.theme).length > 0 && (
                <button type="button" className="btn btn-link" onClick={() => edit({ theme: {} })}>
                  {i18n.t("storeEditor.resetTheme")}
                </button>
              )}
            </>
          )}

          {tab === "sections" && (
            <>
              <ol className="section-list">
                {ordered.map((section, index) => (
                  <li key={section.id} className={section.isVisible ? "" : "is-hidden"}>
                    <details>
                      <summary>
                        <span>{i18n.tx(`section.${section.type}`)}</span>
                        <span className="section-tools">
                          <button type="button" className="icon-btn" disabled={index === 0} onClick={() => move(index, -1)} aria-label={i18n.t("storeEditor.moveUp")}>
                            <Icon name="up" />
                          </button>
                          <button type="button" className="icon-btn" disabled={index === ordered.length - 1} onClick={() => move(index, 1)} aria-label={i18n.t("storeEditor.moveDown")}>
                            <Icon name="down" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => editSection(section.id, { isVisible: !section.isVisible })}
                            aria-label={section.isVisible ? i18n.t("storeEditor.hide") : i18n.t("storeEditor.show")}
                          >
                            <Icon name={section.isVisible ? "eye" : "eyeOff"} />
                          </button>
                          {section.type !== "COVER" && (
                            <button type="button" className="icon-btn" onClick={() => edit({ sections: ordered.filter((item) => item.id !== section.id) })} aria-label={i18n.t("common.delete")}>
                              <Icon name="trash" />
                            </button>
                          )}
                        </span>
                      </summary>
                      <div className="form-grid two">
                        <Field label={i18n.t("storeEditor.titleEs")}>
                          <input value={section.titleEs} onChange={(event) => editSection(section.id, { titleEs: event.target.value })} />
                        </Field>
                        <Field label={i18n.t("storeEditor.titleEn")}>
                          <input value={section.titleEn} onChange={(event) => editSection(section.id, { titleEn: event.target.value })} />
                        </Field>
                        {TEXT_SECTIONS.includes(section.type) && (
                          <>
                            <Field label={i18n.t("storeEditor.contentEs")} wide>
                              <textarea rows={3} value={section.contentEs} onChange={(event) => editSection(section.id, { contentEs: event.target.value })} />
                            </Field>
                            <Field label={i18n.t("storeEditor.contentEn")} wide>
                              <textarea rows={3} value={section.contentEn} onChange={(event) => editSection(section.id, { contentEn: event.target.value })} />
                            </Field>
                          </>
                        )}
                        {["STORY", "TECHNIQUE", "WORKSHOP", "FREE_TEXT"].includes(section.type) && (
                          <div className="field field-wide">
                            <span className="field-label">{i18n.t("storeEditor.sectionImage")}</span>
                            {section.imageUrl && <ArtImage className="thumb" src={section.imageUrl} alt="" />}
                            <ImageUploadButton onUploaded={(url) => editSection(section.id, { imageUrl: url })} />
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ol>
              <label className="field">
                <span className="field-label">{i18n.t("storeEditor.addSection")}</span>
                <select
                  value=""
                  onChange={(event) => {
                    if (event.target.value) addSection(event.target.value as SectionType);
                  }}
                >
                  <option value="">—</option>
                  {SECTION_TYPES.filter((type) => type === "FREE_TEXT" || !ordered.some((section) => section.type === type)).map((type) => (
                    <option key={type} value={type}>
                      {i18n.tx(`section.${type}`)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {tab === "info" && (
            <div className="form-grid two">
              <Field label={i18n.t("storeEditor.nameEs")}>
                <input value={store.nameEs} onChange={(event) => edit({ nameEs: event.target.value })} />
              </Field>
              <Field label={i18n.t("storeEditor.nameEn")}>
                <input value={store.nameEn} onChange={(event) => edit({ nameEn: event.target.value })} />
              </Field>
              <Field label={i18n.t("storeEditor.slug")} hint={i18n.t("storeEditor.slugHint", { slug: store.slug })} wide>
                <input value={store.slug} onChange={(event) => edit({ slug: event.target.value })} />
              </Field>
              <Field label={i18n.t("storeEditor.descriptionEs")} wide>
                <textarea rows={2} value={store.descriptionEs} onChange={(event) => edit({ descriptionEs: event.target.value })} />
              </Field>
              <Field label={i18n.t("storeEditor.descriptionEn")} wide>
                <textarea rows={2} value={store.descriptionEn} onChange={(event) => edit({ descriptionEn: event.target.value })} />
              </Field>
              <div className="field">
                <span className="field-label">{i18n.t("storeEditor.logo")}</span>
                {store.logoUrl && <ArtImage className="thumb" src={store.logoUrl} alt="" />}
                <ImageUploadButton onUploaded={(url) => edit({ logoUrl: url })} />
              </div>
              <div className="field">
                <span className="field-label">{i18n.t("storeEditor.banner")}</span>
                {store.bannerUrl && <ArtImage className="thumb" src={store.bannerUrl} alt="" />}
                <ImageUploadButton onUploaded={(url) => edit({ bannerUrl: url })} />
              </div>
              <label className="check field-wide">
                <input type="checkbox" checked={store.acceptsCustomOrders} onChange={(event) => edit({ acceptsCustomOrders: event.target.checked })} /> {i18n.t("storeEditor.acceptsCustom")}
              </label>
              <h2 className="h3 field-wide">{i18n.t("storeEditor.masterData")}</h2>
              <Field label={i18n.t("auth.fullName")}>
                <input value={master.name} onChange={(event) => { setMaster({ ...master, name: event.target.value }); setDirty(true); }} />
              </Field>
              <Field label={i18n.t("auth.workshop")}>
                <input value={master.workshop} onChange={(event) => { setMaster({ ...master, workshop: event.target.value }); setDirty(true); }} />
              </Field>
              <Field label={i18n.t("address.city")}>
                <input value={master.city} onChange={(event) => { setMaster({ ...master, city: event.target.value }); setDirty(true); }} />
              </Field>
              <Field label={i18n.t("storeEditor.bioEs")} wide>
                <textarea rows={3} value={master.biographyEs} onChange={(event) => { setMaster({ ...master, biographyEs: event.target.value }); setDirty(true); }} />
              </Field>
              <Field label={i18n.t("storeEditor.bioEn")} wide>
                <textarea rows={3} value={master.biographyEn} onChange={(event) => { setMaster({ ...master, biographyEn: event.target.value }); setDirty(true); }} />
              </Field>
            </div>
          )}
        </div>
        <div className="editor-preview" aria-label={i18n.t("storeEditor.preview")}>
          <p className="preview-label">{i18n.t("storeEditor.preview")}</p>
          <div className="preview-frame">
            <StoreRenderer summary={{ store, master, artworkCount: previewArtworks.length }} artworks={previewArtworks} auctions={[]} onContact={() => undefined} />
          </div>
        </div>
      </div>
    </>
  );
}
