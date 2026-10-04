import type {
  Announcement,
  Article,
  Branch,
  FaqItem,
  LegalDocument,
  MaintenancePlan,
  NeedSolution,
  Offer,
  ServiceOffering,
} from "@/types/content";
import { guides as guideData, findGuideBySlug } from "@/data/content/guides";
import { faqs as faqData } from "@/data/content/faqs";
import { branches as branchData, branchesByCity, directionsUrl } from "@/data/content/branches";
import { isOfferExpired, isOfferLive, offers as offerData } from "@/data/content/offers";
import { maintenancePlans, serviceOfferings, findServiceBySlug } from "@/data/content/services";
import { needs as needData } from "@/data/content/needs";
import { heroSlides as heroSlideData, type HeroSlide } from "@/data/content/hero";
import { announcements as announcementData } from "@/data/content/announcements";
import { findLegalDocument } from "@/data/content/legal";
import {
  aboutImages,
  aboutParagraphs,
  caseStudies,
  commercialSolutions,
  companyStats,
  companyValues,
  industries,
  projectWorkflow,
  whyRewaa,
} from "@/data/content/business";
import { ApiError } from "@/types/product";

/**
 * Content API — guides, FAQs, branches, offers, service pages, company and
 * legal content. Pages read through here so a CMS can be plugged in later.
 */

function delay(ms = 260): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms * (0.6 + Math.random() * 0.7)));
}

export const contentApi = {
  /** GET /v1/guides */
  async listGuides(): Promise<Article[]> {
    await delay(240);
    return [...guideData].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  },

  /** GET /v1/guides/:slug */
  async getGuide(slug: string): Promise<Article> {
    await delay(260);
    const guide = findGuideBySlug(slug);
    if (!guide) throw new ApiError("لم نعثر على هذا الدليل", "NOT_FOUND", 404);
    return guide;
  },

  /** GET /v1/guides?related=productSlug */
  async guidesForProduct(productSlug: string): Promise<Article[]> {
    await delay(200);
    return guideData.filter((guide) => guide.relatedProductSlugs.includes(productSlug));
  },

  /** GET /v1/faqs */
  async listFaqs(): Promise<FaqItem[]> {
    await delay(220);
    return faqData;
  },

  /** GET /v1/faqs?ids= */
  async faqsByIds(ids: string[]): Promise<FaqItem[]> {
    await delay(160);
    return ids.map((id) => faqData.find((item) => item.id === id)).filter((item): item is FaqItem => Boolean(item));
  },

  /** GET /v1/branches */
  async listBranches(): Promise<Branch[]> {
    await delay(240);
    return branchData;
  },

  /** GET /v1/branches/:cityId */
  async listBranchesByCity(cityId: string): Promise<Branch[]> {
    await delay(200);
    return branchesByCity(cityId);
  },

  /** GET /v1/offers */
  async listOffers(): Promise<{ live: Offer[]; expired: Offer[] }> {
    await delay(280);
    return {
      live: offerData.filter((offer) => isOfferLive(offer)),
      expired: offerData.filter((offer) => isOfferExpired(offer)),
    };
  },

  /**
   * GET /v1/hero-slides
   * Homepage hero content: copy, imagery and CTAs come from data so the hero
   * can later be served by a CMS or by the API without touching components.
   */
  async listHeroSlides(): Promise<HeroSlide[]> {
    await delay(140);
    // Only slides that point at a real, existing route are ever rendered.
    return heroSlideData.filter((slide) => slide.primaryCta.href.startsWith("/"));
  },

  /**
   * GET /v1/announcements
   * Live homepage notices, filtered by their own schedule. Returns an empty
   * array when nothing is scheduled — the UI then renders nothing at all.
   */
  async listAnnouncements(): Promise<Announcement[]> {
    await delay(160);
    const now = Date.now();
    return announcementData.filter((item) => {
      if (item.startsAt && Date.parse(item.startsAt) > now) return false;
      if (item.endsAt && Date.parse(item.endsAt) < now) return false;
      return true;
    });
  },

  /** GET /v1/services */
  async listServices(): Promise<ServiceOffering[]> {
    await delay(240);
    return serviceOfferings;
  },

  /** GET /v1/services/:slug */
  async getService(slug: string): Promise<ServiceOffering> {
    await delay(240);
    const service = findServiceBySlug(slug);
    if (!service) throw new ApiError("لم نعثر على هذه الخدمة", "NOT_FOUND", 404);
    return service;
  },

  /** GET /v1/maintenance-plans */
  async listMaintenancePlans(): Promise<MaintenancePlan[]> {
    await delay(220);
    return maintenancePlans;
  },

  /** GET /v1/needs */
  async listNeeds(): Promise<NeedSolution[]> {
    await delay(200);
    return needData;
  },

  /** GET /v1/company */
  async getCompanyProfile() {
    await delay(220);
    const about = [
      { id: "who", title: "من نحن", body: aboutParagraphs.who.join(" ") },
      { id: "do", title: "ماذا نقدّم", body: aboutParagraphs.do.join(" ") },
      { id: "mission", title: "رسالتنا", body: aboutParagraphs.mission },
      { id: "vision", title: "رؤيتنا", body: aboutParagraphs.vision },
      { id: "after-sales", title: "خدمة ما بعد البيع", body: aboutParagraphs.afterSales },
    ];
    return {
      about,
      values: companyValues,
      stats: companyStats,
      whyRewaa,
      images: [aboutImages.workshop, aboutImages.team, aboutImages.warehouse],
    };
  },

  /** GET /v1/commercial */
  async getCommercialProfile() {
    await delay(240);
    return { industries, solutions: commercialSolutions, workflow: projectWorkflow, caseStudies };
  },

  /** GET /v1/legal/:slug */
  async getLegalDocument(slug: string): Promise<LegalDocument> {
    await delay(220);
    const doc = findLegalDocument(slug);
    if (!doc) throw new ApiError("لم نعثر على هذه الصفحة", "NOT_FOUND", 404);
    return doc;
  },
};

export { directionsUrl };
