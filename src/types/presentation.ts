/**
 * Type definitions for the presentation system
 * Migrated from ai-transformation-presentation-app
 */

// Slide types supported by the presentation system
export type SlideType =
  | "title"
  | "content"
  | "split"
  | "timeline"
  | "metrics"
  | "section"
  | "quote"
  | "metrics-enhanced"
  | "multi-column";

export type LogoType = "qodea" | "custom" | "text" | "image";

export type ColorTheme = "qodea" | "custom";

export type PresentationStatus = "processing" | "completed" | "failed";

// Main presentation interface
export interface Presentation {
  id: string;
  title: string;
  description?: string;
  theme: PresentationTheme;
  slides: Slide[];
}

export interface PresentationTheme {
  logo: LogoType;
  logoText?: string;
  logoImage?: string;
  colors: ColorTheme;
  videoBackground?: string;
}

export interface Slide {
  type: SlideType;
  background?: string;
  title?: string;
  subtitle?: string;
  tagline?: string;
  content?: SlideContent;
  image?: string;
  reverse?: boolean;
  metrics?: Metric[];
  cards?: Card[];
  timeline?: TimelineItem[];
  sections?: SectionItem[];
  quote?: QuoteContent;
  author?: string;
  columns?: ColumnItem[];
  enhancedMetrics?: EnhancedMetric[];
}

export interface SlideContent {
  sections?: ContentSection[];
  deliverables?: Deliverable[];
  benefits?: BenefitSection;
  tips?: Tip[];
  wisdom?: WisdomSection;
  timeline?: TimelineItem[];
}

export interface ContentSection {
  title: string;
  content: string;
}

export interface Deliverable {
  title: string;
  description: string;
}

export interface BenefitSection {
  title: string;
  items: string[];
}

export interface WisdomSection {
  title: string;
  items: string[];
}

export interface Tip {
  title: string;
  description: string;
}

export interface Metric {
  value: string | number;
  label: string;
}

export interface Card {
  title: string;
  description: string;
}

export interface TimelineItem {
  date: string;
  phase: string;
  duration: string;
  description: string;
}

export interface SectionItem {
  number: string;
  title: string;
}

export interface QuoteContent {
  text: string;
  author?: string;
}

export interface ColumnItem {
  icon?: string;
  logo?: string;
  title: string;
  description: string;
}

export interface EnhancedMetric {
  value: string;
  label: string;
  sublabel?: string;
  keyDeals?: string[];
}

// DynamoDB metadata interface
export interface PresentationMetadata {
  id: string;
  title: string;
  description?: string;
  userId: string;
  status: PresentationStatus;
  createdAt: number;
  updatedAt: number;
  theme: PresentationTheme;
  errorMessage?: string;
}

// DynamoDB slide item interface
export interface SlideItem {
  slideIndex: number;
  slide: Slide;
  updatedAt: number;
}

// Request/Response interfaces
export interface CreatePresentationRequest {
  title: string;
  description: string;
}

export interface CreatePresentationResponse {
  presentationId: string;
  status: PresentationStatus;
  message: string;
}

export interface UpdatePresentationRequest {
  title?: string;
  description?: string;
  theme?: PresentationTheme;
}

export interface UpdateSlideRequest {
  instruction: string;
}

export interface UpdateSlideResponse {
  success: boolean;
  affectedSlides: Array<{
    slideIndex: number;
    slide: Slide;
  }>;
}

export interface RefinePresentationRequest {
  instruction: string;
}

export interface RefinePresentationResponse {
  success: boolean;
  affectedSlides: Array<{
    slideIndex: number;
    slide: Slide;
  }>;
}

// SQS message format for async generation
export interface GeneratePresentationMessage {
  presentationId: string;
  userId: string;
  title: string;
  description: string;
  connectionId?: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: "presentation-completed" | "presentation-failed" | "slide-updated";
  presentationId?: string;
  error?: string;
  affectedSlides?: Array<{ slideIndex: number; slide: Slide }>;
}

// User info from authentication
export interface AuthUser {
  email: string;
  name?: string;
}

