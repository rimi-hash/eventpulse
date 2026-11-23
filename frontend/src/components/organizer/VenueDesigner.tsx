import React, { useState, useRef, useEffect, useMemo } from 'react';
import { VenueDto } from '../../types/api';
import { apiClient } from '../../services/apiClient';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Save,
  Eye,
  Trash2,
  Copy,
  Undo2,
  Redo2,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Armchair,
  Grid,
  Plus,
  Compass,
  AlertTriangle,
  Sliders,
  Lock,
  Unlock,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Trophy,
  DoorOpen,
  Music,
  Sparkles,
} from 'lucide-react';

export type ShapeType =
  | 'RECTANGLE'
  | 'ARC'
  | 'STADIUM'
  | 'BANQUET_TABLES'
  | 'GA_FLOOR'
  | 'POLYGON'
  | 'FAN';

export type ArchElementType =
  | 'STAGE'
  | 'FESTIVAL_STAGE'
  | 'CENTER_STAGE'
  | 'CATWALK'
  | 'DJ_BOOTH'
  | 'BASKETBALL_COURT'
  | 'TENNIS_COURT'
  | 'BOXING_RING'
  | 'VOLLEYBALL_COURT'
  | 'SOCCER_PITCH'
  | 'GATE'
  | 'VIP_PORTAL'
  | 'EMERGENCY_EXIT'
  | 'TURNSTILE'
  | 'BARRICADE'
  | 'PLATFORM'
  | 'VIP_ENCLOSURE'
  | 'STANDING_PIT'
  | 'BAR'
  | 'SOUND_BOOTH'
  | 'RESTROOM'
  | 'FIRST_AID'
  | 'MERCH_STAND'
  | 'ENTRY'
  | 'EXIT'
  | 'ACCESSIBLE_RAMP'
  | 'LABEL';

export interface ArchitecturalElement {
  id: string;
  type: ArchElementType;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  color?: string;
}

export interface StudioSeat {
  id?: string;
  rowLabel: string;
  seatNumber: string;
  coordX: number;
  coordY: number;
  rotation?: number;
  tier?: string;
  overridePrice?: number;
  isAccessible: boolean;
  isCompanion: boolean;
  isRestrictedView: boolean;
  isBlocked: boolean;
  tableIndex?: number;
}

export interface StudioSection {
  id: string;
  name: string;
  sectionCode: string;
  shapeType: ShapeType;
  isGeneralAdmission: boolean;
  capacity: number;
  rows: number;
  seatsPerRow: number;
  rowSpacing?: number;
  seatSpacing?: number;
  posX: number;
  posY: number;
  rotation: number;
  arcRadius?: number;
  arcSweepAngle?: number;
  tableCount?: number;
  seatsPerTable?: number;
  tableRadius?: number;
  pricingTier: 'VIP' | 'PLATINUM' | 'PREMIUM' | 'STANDARD' | 'BALCONY' | 'ACCESSIBLE';
  basePrice: number;
  displayOrder: number;
  locked?: boolean;
  seats: StudioSeat[];
}

interface VenueDesignerProps {
  initialVenue?: VenueDto | null;
  onSaved?: (venue: VenueDto) => void;
  fullScreenDefault?: boolean;
}

// -------------------------------------------------------------
// TIER COLOR PALETTE (Light theme accessible)
// -------------------------------------------------------------
export const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  VIP: { label: 'VIP Diamond', color: '#4338ca', bg: '#e0e7ff', border: '#6366f1' },
  PLATINUM: { label: 'Platinum Lounge', color: '#6d28d9', bg: '#ede9fe', border: '#8b5cf6' },
  PREMIUM: { label: 'Premium Gold', color: '#0f766e', bg: '#ccfbf1', border: '#14b8a6' },
  STANDARD: { label: 'Standard Reserved', color: '#1d4ed8', bg: '#dbeafe', border: '#3b82f6' },
  BALCONY: { label: 'Balcony / Economy', color: '#334155', bg: '#f1f5f9', border: '#94a3b8' },
  ACCESSIBLE: { label: 'Accessible Access', color: '#047857', bg: '#d1fae5', border: '#10b981' },
};

// -------------------------------------------------------------
// GEOMETRY GENERATORS
// -------------------------------------------------------------
function generateGridSeats(
  rows: number,
  seatsPerRow: number,
  centerX: number,
  centerY: number,
  tier: string,
  price: number,
  rowPrefix: string = '',
  rowSpacing: number = 28,
  seatSpacing: number = 26
): StudioSeat[] {
  const seats: StudioSeat[] = [];
  const startX = centerX - ((seatsPerRow - 1) * seatSpacing) / 2;
  const startY = centerY - ((rows - 1) * rowSpacing) / 2;

  for (let r = 0; r < rows; r++) {
    const rowLabel = `${rowPrefix}${String.fromCharCode(65 + r)}`;
    for (let s = 1; s <= seatsPerRow; s++) {
      const isAcc = r === 0 && (s === 1 || s === seatsPerRow);
      seats.push({
        rowLabel,
        seatNumber: String(s),
        coordX: Math.round(startX + (s - 1) * seatSpacing),
        coordY: Math.round(startY + r * rowSpacing),
        rotation: 0,
        tier,
        overridePrice: price,
        isAccessible: isAcc,
        isCompanion: isAcc,
        isRestrictedView: false,
        isBlocked: false,
      });
    }
  }
  return seats;
}

function generateArcSeats(
  rows: number,
  seatsPerRow: number,
  centerX: number,
  centerY: number,
  baseRadius: number,
  sweepDeg: number,
  tier: string,
  price: number,
  rowPrefix: string = ''
): StudioSeat[] {
  const seats: StudioSeat[] = [];
  const startAngle = (180 - sweepDeg) / 2;
  const angleStep = sweepDeg / (seatsPerRow - 1 || 1);

  for (let r = 0; r < rows; r++) {
    const rowLabel = `${rowPrefix}${String.fromCharCode(65 + r)}`;
    const radius = baseRadius + r * 30;
    for (let s = 1; s <= seatsPerRow; s++) {
      const angleDeg = startAngle + (s - 1) * angleStep;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = centerX + radius * Math.cos(angleRad);
      const y = centerY - radius * Math.sin(angleRad) + baseRadius * 0.7;
      seats.push({
        rowLabel,
        seatNumber: String(s),
        coordX: Math.round(x),
        coordY: Math.round(y),
        rotation: Math.round(90 - angleDeg),
        tier,
        overridePrice: price,
        isAccessible: r === 0 && (s === 1 || s === seatsPerRow),
        isCompanion: false,
        isRestrictedView: s === 1 || s === seatsPerRow,
        isBlocked: false,
      });
    }
  }
  return seats;
}

function generateStadiumSeats(
  rows: number,
  seatsPerRow: number,
  centerX: number,
  centerY: number,
  baseRadius: number,
  sweepDeg: number,
  tier: string,
  price: number,
  prefix: string = 'S'
): StudioSeat[] {
  const seats: StudioSeat[] = [];
  const startAngle = (180 - sweepDeg) / 2;
  const angleStep = sweepDeg / (seatsPerRow - 1 || 1);

  for (let r = 0; r < rows; r++) {
    const rowLabel = `${prefix}${r + 1}`;
    const radius = baseRadius + r * 28;
    for (let s = 1; s <= seatsPerRow; s++) {
      const angleDeg = startAngle + (s - 1) * angleStep;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = centerX + radius * Math.cos(angleRad);
      const y = centerY - radius * Math.sin(angleRad) + baseRadius * 0.65;
      seats.push({
        rowLabel,
        seatNumber: String(s),
        coordX: Math.round(x),
        coordY: Math.round(y),
        rotation: Math.round(90 - angleDeg),
        tier,
        overridePrice: price,
        isAccessible: r === rows - 1 && s <= 2,
        isCompanion: false,
        isRestrictedView: false,
        isBlocked: false,
      });
    }
  }
  return seats;
}

function generateBanquetSeats(
  tableCount: number,
  seatsPerTable: number,
  tableRadius: number,
  centerX: number,
  centerY: number,
  tier: string,
  price: number,
  tablePrefix: string = 'T'
): StudioSeat[] {
  const seats: StudioSeat[] = [];
  const cols = Math.min(tableCount, 4);
  const spacingX = 170;
  const spacingY = 160;
  const chairOffset = tableRadius + 15;

  for (let t = 0; t < tableCount; t++) {
    const colIdx = t % cols;
    const rowIdx = Math.floor(t / cols);
    const tableX = centerX - ((cols - 1) * spacingX) / 2 + colIdx * spacingX;
    const tableY = centerY + rowIdx * spacingY;
    const tableLabel = `${tablePrefix}${t + 1}`;

    for (let s = 1; s <= seatsPerTable; s++) {
      const angleRad = ((s - 1) * (2 * Math.PI)) / seatsPerTable;
      const chairX = tableX + chairOffset * Math.cos(angleRad);
      const chairY = tableY + chairOffset * Math.sin(angleRad);
      seats.push({
        rowLabel: tableLabel,
        seatNumber: String(s),
        coordX: Math.round(chairX),
        coordY: Math.round(chairY),
        rotation: Math.round((angleRad * 180) / Math.PI),
        tier,
        overridePrice: price,
        isAccessible: s === 1,
        isCompanion: false,
        isRestrictedView: false,
        isBlocked: false,
        tableIndex: t,
      });
    }
  }
  return seats;
}

// -------------------------------------------------------------
// 10 COMPREHENSIVE VENUE TEMPLATES
// -------------------------------------------------------------
export const PRESETS: Record<
  string,
  { name: string; category: string; description: string; sections: StudioSection[]; elements: ArchitecturalElement[] }
> = {
  THEATRE: {
    name: 'Proscenium Theatre',
    category: 'Theatre & Performing Arts',
    description: 'Classic auditorium with Main Stage, Front VIP Orchestra, Curved Arc Stalls, and Upper Balcony',
    elements: [
      { id: 'el-stage', type: 'STAGE', label: 'MAIN PROSCENIUM STAGE', posX: 0, posY: -40, width: 340, height: 70, rotation: 0 },
      { id: 'el-entry-l', type: 'ENTRY', label: 'Door 1 (West)', posX: -360, posY: 280, width: 80, height: 35, rotation: 0 },
      { id: 'el-entry-r', type: 'ENTRY', label: 'Door 2 (East)', posX: 360, posY: 280, width: 80, height: 35, rotation: 0 },
      { id: 'el-foh', type: 'SOUND_BOOTH', label: 'Sound & Lighting FOH', posX: 0, posY: 530, width: 140, height: 45, rotation: 0 },
    ],
    sections: [
      {
        id: 'sec-vip-orch',
        name: 'VIP Front Orchestra',
        sectionCode: 'ORCH-VIP',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 40,
        rows: 4,
        seatsPerRow: 10,
        posX: 0,
        posY: 90,
        rotation: 0,
        pricingTier: 'VIP',
        basePrice: 4500,
        displayOrder: 1,
        seats: generateGridSeats(4, 10, 0, 90, 'VIP', 4500),
      },
      {
        id: 'sec-arc-stalls',
        name: 'Curved Stalls (Arc)',
        sectionCode: 'ARC-STALLS',
        shapeType: 'ARC',
        isGeneralAdmission: false,
        capacity: 48,
        rows: 4,
        seatsPerRow: 12,
        posX: 0,
        posY: 220,
        rotation: 0,
        arcRadius: 210,
        arcSweepAngle: 110,
        pricingTier: 'PREMIUM',
        basePrice: 2800,
        displayOrder: 2,
        seats: generateArcSeats(4, 12, 0, 220, 210, 110, 'PREMIUM', 2800),
      },
      {
        id: 'sec-mezz-balc',
        name: 'Mezzanine Balcony',
        sectionCode: 'MEZZ-BALC',
        shapeType: 'STADIUM',
        isGeneralAdmission: false,
        capacity: 60,
        rows: 5,
        seatsPerRow: 12,
        posX: 0,
        posY: 390,
        rotation: 0,
        arcRadius: 330,
        arcSweepAngle: 130,
        pricingTier: 'STANDARD',
        basePrice: 1600,
        displayOrder: 3,
        seats: generateStadiumSeats(5, 12, 0, 390, 330, 130, 'STANDARD', 1600),
      },
    ],
  },

  CONCERT_HALL: {
    name: 'Concert Hall',
    category: 'Acoustic & Classical',
    description: 'Symphonic acoustic hall with Stage, Center Parterre, Left/Right Loges, and Grand Balcony',
    elements: [
      { id: 'el-stage', type: 'STAGE', label: 'SYMPHONY ACOUSTIC STAGE', posX: 0, posY: -50, width: 380, height: 80, rotation: 0 },
      { id: 'el-vip-l', type: 'VIP_ENCLOSURE', label: 'Royal Box A', posX: -320, posY: 100, width: 80, height: 60, rotation: 0 },
      { id: 'el-vip-r', type: 'VIP_ENCLOSURE', label: 'Royal Box B', posX: 320, posY: 100, width: 80, height: 60, rotation: 0 },
    ],
    sections: [
      {
        id: 'sec-parterre',
        name: 'Center Parterre',
        sectionCode: 'PARTERRE',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 50,
        rows: 5,
        seatsPerRow: 10,
        posX: 0,
        posY: 80,
        rotation: 0,
        pricingTier: 'PLATINUM',
        basePrice: 5000,
        displayOrder: 1,
        seats: generateGridSeats(5, 10, 0, 80, 'PLATINUM', 5000),
      },
      {
        id: 'sec-loge-l',
        name: 'Tiered Loge (West)',
        sectionCode: 'LOGE-W',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 24,
        rows: 4,
        seatsPerRow: 6,
        posX: -210,
        posY: 100,
        rotation: 12,
        pricingTier: 'PREMIUM',
        basePrice: 3200,
        displayOrder: 2,
        seats: generateGridSeats(4, 6, -210, 100, 'PREMIUM', 3200, 'LW'),
      },
      {
        id: 'sec-loge-r',
        name: 'Tiered Loge (East)',
        sectionCode: 'LOGE-E',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 24,
        rows: 4,
        seatsPerRow: 6,
        posX: 210,
        posY: 100,
        rotation: -12,
        pricingTier: 'PREMIUM',
        basePrice: 3200,
        displayOrder: 3,
        seats: generateGridSeats(4, 6, 210, 100, 'PREMIUM', 3200, 'LE'),
      },
      {
        id: 'sec-amphi',
        name: 'Acoustic Amphitheatre Tier',
        sectionCode: 'AMPHI-TIER',
        shapeType: 'ARC',
        isGeneralAdmission: false,
        capacity: 56,
        rows: 4,
        seatsPerRow: 14,
        posX: 0,
        posY: 260,
        rotation: 0,
        arcRadius: 250,
        arcSweepAngle: 125,
        pricingTier: 'STANDARD',
        basePrice: 1800,
        displayOrder: 4,
        seats: generateArcSeats(4, 14, 0, 260, 250, 125, 'STANDARD', 1800),
      },
    ],
  },

  ARENA_CONCERT: {
    name: 'Arena Mega-Stage',
    category: 'Rock & Arena Tours',
    description: 'Enormous arena with Mega-Stage, Runway/Catwalk, Standing Floor Pit, and Radial Grandstands',
    elements: [
      { id: 'el-stage', type: 'STAGE', label: 'MAIN HEADLINE STAGE', posX: 0, posY: -60, width: 360, height: 75, rotation: 0 },
      { id: 'el-catwalk', type: 'CATWALK', label: 'Catwalk Runway', posX: 0, posY: 30, width: 40, height: 110, rotation: 0 },
      { id: 'el-bar-l', type: 'BAR', label: 'Beverage & Bar A', posX: -350, posY: 170, width: 80, height: 40, rotation: 0 },
      { id: 'el-bar-r', type: 'BAR', label: 'Beverage & Bar B', posX: 350, posY: 170, width: 80, height: 40, rotation: 0 },
    ],
    sections: [
      {
        id: 'sec-ga-pit',
        name: 'General Admission Floor Pit',
        sectionCode: 'GA-PIT',
        shapeType: 'GA_FLOOR',
        isGeneralAdmission: true,
        capacity: 650,
        rows: 0,
        seatsPerRow: 0,
        posX: 0,
        posY: 120,
        rotation: 0,
        pricingTier: 'PREMIUM',
        basePrice: 2400,
        displayOrder: 1,
        seats: [],
      },
      {
        id: 'sec-vip-gold-l',
        name: 'VIP Golden Circle (Left)',
        sectionCode: 'GOLD-L',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 24,
        rows: 4,
        seatsPerRow: 6,
        posX: -220,
        posY: 100,
        rotation: -15,
        pricingTier: 'VIP',
        basePrice: 5500,
        displayOrder: 2,
        seats: generateGridSeats(4, 6, -220, 100, 'VIP', 5500, 'GL'),
      },
      {
        id: 'sec-vip-gold-r',
        name: 'VIP Golden Circle (Right)',
        sectionCode: 'GOLD-R',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 24,
        rows: 4,
        seatsPerRow: 6,
        posX: 220,
        posY: 100,
        rotation: 15,
        pricingTier: 'VIP',
        basePrice: 5500,
        displayOrder: 3,
        seats: generateGridSeats(4, 6, 220, 100, 'VIP', 5500, 'GR'),
      },
      {
        id: 'sec-stadium-bowl',
        name: 'Grandstand Tier 1 Bowl',
        sectionCode: 'BOWL-T1',
        shapeType: 'STADIUM',
        isGeneralAdmission: false,
        capacity: 70,
        rows: 5,
        seatsPerRow: 14,
        posX: 0,
        posY: 320,
        rotation: 0,
        arcRadius: 300,
        arcSweepAngle: 140,
        pricingTier: 'STANDARD',
        basePrice: 1800,
        displayOrder: 4,
        seats: generateStadiumSeats(5, 14, 0, 320, 300, 140, 'STANDARD', 1800),
      },
    ],
  },

  STADIUM: {
    name: 'Sports Stadium Arena',
    category: 'Stadium Sports',
    description: 'Surrounding stadium with North/South/East/West tiered bowl stands and pitch field',
    elements: [
      { id: 'el-pitch', type: 'PLATFORM', label: 'SPORTS ARENA PITCH / FIELD', posX: 0, posY: 140, width: 340, height: 180, rotation: 0 },
      { id: 'el-entry-n', type: 'ENTRY', label: 'Gate 1 (North)', posX: 0, posY: -70, width: 90, height: 30, rotation: 0 },
      { id: 'el-entry-s', type: 'ENTRY', label: 'Gate 2 (South)', posX: 0, posY: 450, width: 90, height: 30, rotation: 0 },
    ],
    sections: [
      {
        id: 'sec-stand-north',
        name: 'North Pavilion Stand',
        sectionCode: 'PAV-N',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 40,
        rows: 4,
        seatsPerRow: 10,
        posX: 0,
        posY: 10,
        rotation: 0,
        pricingTier: 'VIP',
        basePrice: 3500,
        displayOrder: 1,
        seats: generateGridSeats(4, 10, 0, 10, 'VIP', 3500, 'N'),
      },
      {
        id: 'sec-stand-south',
        name: 'South Grandstand',
        sectionCode: 'STAND-S',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 50,
        rows: 5,
        seatsPerRow: 10,
        posX: 0,
        posY: 360,
        rotation: 0,
        pricingTier: 'PREMIUM',
        basePrice: 2200,
        displayOrder: 2,
        seats: generateGridSeats(5, 10, 0, 360, 'PREMIUM', 2200, 'S'),
      },
      {
        id: 'sec-terrace-w',
        name: 'West Terraces',
        sectionCode: 'TERR-W',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 32,
        rows: 8,
        seatsPerRow: 4,
        posX: -260,
        posY: 140,
        rotation: 0,
        pricingTier: 'STANDARD',
        basePrice: 1200,
        displayOrder: 3,
        seats: generateGridSeats(8, 4, -260, 140, 'STANDARD', 1200, 'W'),
      },
      {
        id: 'sec-terrace-e',
        name: 'East Terraces',
        sectionCode: 'TERR-E',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 32,
        rows: 8,
        seatsPerRow: 4,
        posX: 260,
        posY: 140,
        rotation: 0,
        pricingTier: 'STANDARD',
        basePrice: 1200,
        displayOrder: 4,
        seats: generateGridSeats(8, 4, 260, 140, 'STANDARD', 1200, 'E'),
      },
    ],
  },

  OUTDOOR_FESTIVAL: {
    name: 'Outdoor Festival Grounds',
    category: 'Festivals',
    description: 'Expansive open-air festival ground with Festival Main Stage, Front Pit, GA Grass Lawn, and VIP Deck',
    elements: [
      { id: 'el-stage', type: 'STAGE', label: 'SUNSET FESTIVAL MAIN STAGE', posX: 0, posY: -40, width: 400, height: 80, rotation: 0 },
      { id: 'el-bar-1', type: 'BAR', label: 'Craft Bar Zone', posX: -320, posY: 200, width: 90, height: 45, rotation: 0 },
      { id: 'el-bar-2', type: 'BAR', label: 'Artisan Food Village', posX: 320, posY: 200, width: 90, height: 45, rotation: 0 },
      { id: 'el-exit-1', type: 'EXIT', label: 'Emergency Exit North', posX: -360, posY: 30, width: 80, height: 30, rotation: 0 },
    ],
    sections: [
      {
        id: 'sec-fest-vip',
        name: 'Elevated VIP Skydeck',
        sectionCode: 'FEST-VIP',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 30,
        rows: 3,
        seatsPerRow: 10,
        posX: 0,
        posY: 80,
        rotation: 0,
        pricingTier: 'VIP',
        basePrice: 6500,
        displayOrder: 1,
        seats: generateGridSeats(3, 10, 0, 80, 'VIP', 6500, 'V'),
      },
      {
        id: 'sec-fest-ga',
        name: 'General Admission Open Lawn',
        sectionCode: 'GA-LAWN',
        shapeType: 'GA_FLOOR',
        isGeneralAdmission: true,
        capacity: 1200,
        rows: 0,
        seatsPerRow: 0,
        posX: 0,
        posY: 240,
        rotation: 0,
        pricingTier: 'STANDARD',
        basePrice: 1500,
        displayOrder: 2,
        seats: [],
      },
    ],
  },

  GA_CONCERT_FLOOR: {
    name: 'GA Concert Hall & Pit',
    category: 'Concert & Club',
    description: 'High-energy venue with Front Pit, General Admission floor, Mezzanine standing rails',
    elements: [
      { id: 'el-stage', type: 'STAGE', label: 'LIVE CONCERT STAGE', posX: 0, posY: -30, width: 320, height: 65, rotation: 0 },
      { id: 'el-bar', type: 'BAR', label: 'Main Bar', posX: -240, posY: 220, width: 70, height: 40, rotation: 0 },
    ],
    sections: [
      {
        id: 'sec-pit-front',
        name: 'Front Stage Mosh Pit',
        sectionCode: 'PIT-FRONT',
        shapeType: 'GA_FLOOR',
        isGeneralAdmission: true,
        capacity: 250,
        rows: 0,
        seatsPerRow: 0,
        posX: 0,
        posY: 80,
        rotation: 0,
        pricingTier: 'PREMIUM',
        basePrice: 2200,
        displayOrder: 1,
        seats: [],
      },
      {
        id: 'sec-floor-main',
        name: 'Main Floor General Admission',
        sectionCode: 'GA-MAIN',
        shapeType: 'GA_FLOOR',
        isGeneralAdmission: true,
        capacity: 500,
        rows: 0,
        seatsPerRow: 0,
        posX: 0,
        posY: 220,
        rotation: 0,
        pricingTier: 'STANDARD',
        basePrice: 1400,
        displayOrder: 2,
        seats: [],
      },
    ],
  },

  BANQUET_GALA: {
    name: 'Ballroom & Banquet Gala',
    category: 'Corporate & Banquets',
    description: 'Round dining tables with 8 chairs each, Presidential head tables, and Stage',
    elements: [
      { id: 'el-stage', type: 'STAGE', label: 'HEAD PRESIDENCY STAGE', posX: 0, posY: -40, width: 300, height: 60, rotation: 0 },
      { id: 'el-bar', type: 'BAR', label: 'Champagne & Cocktail Bar', posX: -300, posY: 180, width: 80, height: 45, rotation: 0 },
    ],
    sections: [
      {
        id: 'sec-vip-tables',
        name: 'Presidential Diamond Tables',
        sectionCode: 'TBL-PRES',
        shapeType: 'BANQUET_TABLES',
        isGeneralAdmission: false,
        capacity: 24,
        rows: 1,
        seatsPerRow: 3,
        posX: 0,
        posY: 70,
        rotation: 0,
        tableCount: 3,
        seatsPerTable: 8,
        tableRadius: 40,
        pricingTier: 'VIP',
        basePrice: 6000,
        displayOrder: 1,
        seats: generateBanquetSeats(3, 8, 40, 0, 70, 'VIP', 6000, 'P'),
      },
      {
        id: 'sec-main-tables',
        name: 'Grand Ballroom Tables',
        sectionCode: 'TBL-MAIN',
        shapeType: 'BANQUET_TABLES',
        isGeneralAdmission: false,
        capacity: 64,
        rows: 2,
        seatsPerRow: 4,
        posX: 0,
        posY: 220,
        rotation: 0,
        tableCount: 8,
        seatsPerTable: 8,
        tableRadius: 38,
        pricingTier: 'PREMIUM',
        basePrice: 3800,
        displayOrder: 2,
        seats: generateBanquetSeats(8, 8, 38, 0, 220, 'PREMIUM', 3800, 'T'),
      },
    ],
  },

  CONFERENCE_HALL: {
    name: 'Conference & Keynote Summit',
    category: 'Conferences & Tech',
    description: 'Executive conference hall with Keynote Stage, Left/Center/Right delegate rows, and AV Tech Booth',
    elements: [
      { id: 'el-stage', type: 'STAGE', label: 'KEYNOTE PRESENTATION STAGE', posX: 0, posY: -40, width: 360, height: 65, rotation: 0 },
      { id: 'el-av', type: 'SOUND_BOOTH', label: 'AV & Live Stream Control', posX: 0, posY: 390, width: 140, height: 40, rotation: 0 },
    ],
    sections: [
      {
        id: 'sec-conf-center',
        name: 'Center Delegate Rows',
        sectionCode: 'CONF-CTR',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 60,
        rows: 6,
        seatsPerRow: 10,
        posX: 0,
        posY: 120,
        rotation: 0,
        pricingTier: 'PLATINUM',
        basePrice: 3500,
        displayOrder: 1,
        seats: generateGridSeats(6, 10, 0, 120, 'PLATINUM', 3500, 'C'),
      },
      {
        id: 'sec-conf-left',
        name: 'West Delegate Wing',
        sectionCode: 'CONF-W',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 30,
        rows: 6,
        seatsPerRow: 5,
        posX: -200,
        posY: 120,
        rotation: 8,
        pricingTier: 'STANDARD',
        basePrice: 2000,
        displayOrder: 2,
        seats: generateGridSeats(6, 5, -200, 120, 'STANDARD', 2000, 'W'),
      },
      {
        id: 'sec-conf-right',
        name: 'East Delegate Wing',
        sectionCode: 'CONF-E',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 30,
        rows: 6,
        seatsPerRow: 5,
        posX: 200,
        posY: 120,
        rotation: -8,
        pricingTier: 'STANDARD',
        basePrice: 2000,
        displayOrder: 3,
        seats: generateGridSeats(6, 5, 200, 120, 'STANDARD', 2000, 'E'),
      },
    ],
  },

  CINEMA_SEATING: {
    name: 'Cinema & Screening Room',
    category: 'Film & Screenings',
    description: 'Raked proscenium cinema layout with Silver Screen, Premium Loungers, and Standard Rows',
    elements: [
      { id: 'el-screen', type: 'STAGE', label: '4K CURVED SILVER SCREEN', posX: 0, posY: -30, width: 340, height: 35, rotation: 0 },
    ],
    sections: [
      {
        id: 'sec-cine-loungers',
        name: 'VIP Recliner Loungers',
        sectionCode: 'RECLINERS',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 16,
        rows: 2,
        seatsPerRow: 8,
        posX: 0,
        posY: 60,
        rotation: 0,
        pricingTier: 'VIP',
        basePrice: 1800,
        displayOrder: 1,
        seats: generateGridSeats(2, 8, 0, 60, 'VIP', 1800, 'R', 35, 34),
      },
      {
        id: 'sec-cine-standard',
        name: 'Main Cinema Stalls',
        sectionCode: 'STALLS',
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 64,
        rows: 8,
        seatsPerRow: 8,
        posX: 0,
        posY: 220,
        rotation: 0,
        pricingTier: 'STANDARD',
        basePrice: 850,
        displayOrder: 2,
        seats: generateGridSeats(8, 8, 0, 220, 'STANDARD', 850, 'S', 28, 28),
      },
    ],
  },

  MIXED_SEATING_STANDING: {
    name: 'Mixed Seated & Standing Club',
    category: 'Club & Live Venues',
    description: 'Contemporary hybrid club with Front Standing Pit, Mezzanine Seated Tier, and Private VIP Booths',
    elements: [
      { id: 'el-stage', type: 'STAGE', label: 'LIVE CLUB STAGE', posX: 0, posY: -35, width: 280, height: 60, rotation: 0 },
      { id: 'el-bar', type: 'BAR', label: 'Cocktail Lounge Bar', posX: -250, posY: 260, width: 80, height: 45, rotation: 0 },
    ],
    sections: [
      {
        id: 'sec-mix-pit',
        name: 'Floor Standing Pit',
        sectionCode: 'PIT',
        shapeType: 'GA_FLOOR',
        isGeneralAdmission: true,
        capacity: 350,
        rows: 0,
        seatsPerRow: 0,
        posX: 0,
        posY: 80,
        rotation: 0,
        pricingTier: 'STANDARD',
        basePrice: 1500,
        displayOrder: 1,
        seats: [],
      },
      {
        id: 'sec-mix-mezz',
        name: 'Elevated Seated Balcony',
        sectionCode: 'MEZZ',
        shapeType: 'ARC',
        isGeneralAdmission: false,
        capacity: 40,
        rows: 4,
        seatsPerRow: 10,
        posX: 0,
        posY: 260,
        rotation: 0,
        arcRadius: 210,
        arcSweepAngle: 110,
        pricingTier: 'PREMIUM',
        basePrice: 2800,
        displayOrder: 2,
        seats: generateArcSeats(4, 10, 0, 260, 210, 110, 'PREMIUM', 2800),
      },
    ],
  },
};

// -------------------------------------------------------------
// MAIN VENUE ARCHITECT COMPONENT
// -------------------------------------------------------------
export const VenueDesigner: React.FC<VenueDesignerProps> = ({
  initialVenue,
  onSaved,
  fullScreenDefault = false,
}) => {
  const [venueName, setVenueName] = useState(initialVenue?.name || 'Express Avenue Live Arena');
  const [addressLine1, setAddressLine1] = useState(initialVenue?.addressLine1 || 'Royapettah');
  const [city, setCity] = useState(initialVenue?.city || 'Chennai');
  const [state] = useState(initialVenue?.state || 'Tamil Nadu');
  const [postalCode, setPostalCode] = useState(initialVenue?.postalCode || '600014');
  const [layoutVersion, setLayoutVersion] = useState<number>(initialVenue?.layoutVersion || 1);

  // Studio sections state - defaults to empty layout unless an existing venue layout is provided
  const [sections, setSections] = useState<StudioSection[]>(() => {
    if (initialVenue?.layoutJson) {
      try {
        const parsed = JSON.parse(initialVenue.layoutJson);
        if (parsed.sections && Array.isArray(parsed.sections)) {
          return parsed.sections;
        }
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn('Failed to parse layoutJson, starting with empty layout', e);
      }
    }
    return [];
  });

  // Architectural elements (stages, catwalks, bars, markers) - defaults to empty
  const [elements, setElements] = useState<ArchitecturalElement[]>(() => {
    if (initialVenue?.layoutJson) {
      try {
        const parsed = JSON.parse(initialVenue.layoutJson);
        if (parsed.elements && Array.isArray(parsed.elements)) {
          return parsed.elements;
        }
      } catch (e) {
        // Fall back
      }
    }
    return [];
  });

  // Selection states
  const [selectedSectionId, setSelectedSectionId] = useState<string>(() => sections[0]?.id || '');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<{
    sectionId: string;
    rowLabel: string;
    seatNumber: string;
    coordX: number;
    coordY: number;
    tier?: string;
    overridePrice?: number;
    isAccessible: boolean;
    isCompanion: boolean;
    isRestrictedView: boolean;
    isBlocked: boolean;
  } | null>(null);

  // Tooling states
  const [isFullScreen, setIsFullScreen] = useState(fullScreenDefault);
  const [previewMode, setPreviewMode] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState<number>(20);
  const [toolboxTab, setToolboxTab] = useState<'SHAPES' | 'STAGES' | 'COURTS' | 'GATES' | 'AMENITIES' | 'TEMPLATES' | 'SECTIONS'>('SHAPES');

  // Resizable Panels State
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(310);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(330);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);

  // Clear Seating Layout Modal State
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [clearScope, setClearScope] = useState<'ACTIVE_SECTION' | 'ALL_SECTIONS'>('ACTIVE_SECTION');

  // Save Custom Layout Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [customLayoutName, setCustomLayoutName] = useState<string>(venueName);

  // Customer preview cart simulation
  const [previewCart, setPreviewCart] = useState<
    Array<{ sectionId: string; seatKey: string; rowLabel: string; seatNumber: string; price: number; tier: string }>
  >([]);

  // Canvas viewport navigation
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 380, y: 140 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Smooth dragging for elements, sections, and individual seats
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragItem, setDragItem] = useState<{
    type: 'SECTION' | 'ELEMENT' | 'SEAT';
    id: string;
    startClientX: number;
    startClientY: number;
    initialPosX: number;
    initialPosY: number;
    initialSeats?: StudioSeat[];
  } | null>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<Array<{ sections: StudioSection[]; elements: ArchitecturalElement[] }>>([
    { sections, elements },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Persistence status
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<SVGSVGElement | null>(null);
  const lastCanvasWidthRef = useRef<number | null>(null);
  const lastCanvasHeightRef = useRef<number | null>(null);

  const activeSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const activeElement = elements.find((el) => el.id === selectedElementId);

  // Compute bounding box of venue contents to guarantee centered view
  const calculateContentBounds = () => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    if (sections.length === 0 && elements.length === 0) {
      return { centerX: 0, centerY: 60, width: 360, height: 220 };
    }

    elements.forEach((el) => {
      const halfW = (el.width || 100) / 2;
      const halfH = (el.height || 60) / 2;
      minX = Math.min(minX, el.posX - halfW);
      maxX = Math.max(maxX, el.posX + halfW);
      minY = Math.min(minY, el.posY - halfH);
      maxY = Math.max(maxY, el.posY + halfH);
    });

    sections.forEach((sec) => {
      if (sec.seats && sec.seats.length > 0) {
        sec.seats.forEach((st) => {
          minX = Math.min(minX, st.coordX - 16);
          maxX = Math.max(maxX, st.coordX + 16);
          minY = Math.min(minY, st.coordY - 16);
          maxY = Math.max(maxY, st.coordY + 16);
        });
      } else {
        const halfW = 180;
        const halfH = 60;
        minX = Math.min(minX, sec.posX - halfW);
        maxX = Math.max(maxX, sec.posX + halfW);
        minY = Math.min(minY, sec.posY - halfH);
        maxY = Math.max(maxY, sec.posY + halfH);
      }
    });

    if (minX === Infinity) {
      return { centerX: 0, centerY: 60, width: 360, height: 220 };
    }

    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: Math.max(100, maxX - minX),
      height: Math.max(100, maxY - minY),
    };
  };

  // Keep layout centered in visible workspace
  const handleCenterView = () => {
    if (!mainRef.current) return;
    const viewW = mainRef.current.clientWidth;
    const viewH = mainRef.current.clientHeight;
    const bounds = calculateContentBounds();
    setPan({
      x: Math.round(viewW / 2 - bounds.centerX * zoom),
      y: Math.round(viewH / 2 - bounds.centerY * zoom),
    });
  };

  // Center on initial component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCenterView();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // When left or right panel collapses, expands, or window resizes, adjust pan to keep architecture centered
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mainRef.current) {
        const currentW = mainRef.current.clientWidth;
        const currentH = mainRef.current.clientHeight;
        if (lastCanvasWidthRef.current !== null && lastCanvasHeightRef.current !== null) {
          const deltaW = currentW - lastCanvasWidthRef.current;
          const deltaH = currentH - lastCanvasHeightRef.current;
          if (deltaW !== 0 || deltaH !== 0) {
            setPan((prev) => ({
              x: Math.round(prev.x + deltaW / 2),
              y: Math.round(prev.y + deltaH / 2),
            }));
          }
        }
        lastCanvasWidthRef.current = currentW;
        lastCanvasHeightRef.current = currentH;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isLeftCollapsed, isRightCollapsed, isFullScreen, leftPanelWidth, rightPanelWidth]);

  // Push state to undo stack
  const pushState = (newSections: StudioSection[], newElements?: ArchitecturalElement[]) => {
    const elState = newElements !== undefined ? newElements : elements;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ sections: newSections, elements: elState });
    if (newHistory.length > 25) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setSections(newSections);
    if (newElements !== undefined) setElements(newElements);
    setHasUnsavedChanges(true);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setSections(target.sections);
      setElements(target.elements);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setSections(target.sections);
      setElements(target.elements);
      setHasUnsavedChanges(true);
    }
  };


  // Window mouse move & up listeners for smooth divider resizing
  useEffect(() => {
    if (!isResizingLeft && !isResizingRight) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        setLeftPanelWidth(Math.max(220, Math.min(500, e.clientX)));
      } else if (isResizingRight) {
        setRightPanelWidth(Math.max(240, Math.min(520, window.innerWidth - e.clientX)));
      }
    };

    const handleWindowMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  // Direct manipulation: Lock/Unlock
  const handleToggleLockSection = (secId: string) => {
    const updated = sections.map((s) => {
      if (s.id === secId) {
        return { ...s, locked: !s.locked };
      }
      return s;
    });
    pushState(updated);
  };

  // Direct manipulation: Rotate Section
  const handleRotateSection = (secId: string, angleDelta: number) => {
    const updated = sections.map((s) => {
      if (s.id === secId) {
        const nextRot = ((s.rotation || 0) + angleDelta) % 360;
        return { ...s, rotation: nextRot };
      }
      return s;
    });
    pushState(updated);
  };

  // Direct manipulation: Z-Index Ordering
  const handleBringSectionToFront = (secId: string) => {
    const target = sections.find((s) => s.id === secId);
    if (!target) return;
    const remaining = sections.filter((s) => s.id !== secId);
    pushState([...remaining, target]);
  };

  const handleSendSectionToBack = (secId: string) => {
    const target = sections.find((s) => s.id === secId);
    if (!target) return;
    const remaining = sections.filter((s) => s.id !== secId);
    pushState([target, ...remaining]);
  };

  // Safe Clear Seating Layout Action (supports zero-seat draft, undoable)
  const handleClearSeatingLayout = (scope: 'ACTIVE_SECTION' | 'ALL_SECTIONS') => {
    if (scope === 'ACTIVE_SECTION') {
      if (!activeSection) return;
      const updated = sections.map((s) => {
        if (s.id === activeSection.id) {
          return {
            ...s,
            seats: [],
            capacity: s.isGeneralAdmission ? s.capacity : 0,
          };
        }
        return s;
      });
      pushState(updated);
      setSelectedSeat(null);
    } else {
      const updated = sections.map((s) => ({
        ...s,
        seats: [],
        capacity: s.isGeneralAdmission ? s.capacity : 0,
      }));
      pushState(updated);
      setSelectedSeat(null);
    }
    setIsClearModalOpen(false);
  };

  // Apply preset template
  const handleApplyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      pushState(preset.sections, preset.elements);
      setSelectedSectionId(preset.sections[0]?.id || '');
      setSelectedElementId(null);
      setSelectedSeat(null);
    }
  };

  // Add customized shapes
  const handleAddCustomShape = (shape: ShapeType) => {
    const nextIdx = sections.length + 1;
    let newSec: StudioSection;

    if (shape === 'ARC') {
      newSec = {
        id: `sec-arc-${Date.now()}`,
        name: `Curved Arc Section ${nextIdx}`,
        sectionCode: `ARC-${nextIdx}`,
        shapeType: 'ARC',
        isGeneralAdmission: false,
        capacity: 36,
        rows: 3,
        seatsPerRow: 12,
        posX: 0,
        posY: 220,
        rotation: 0,
        arcRadius: 200,
        arcSweepAngle: 100,
        pricingTier: 'PREMIUM',
        basePrice: 2800,
        displayOrder: nextIdx,
        seats: generateArcSeats(3, 12, 0, 220, 200, 100, 'PREMIUM', 2800),
      };
    } else if (shape === 'BANQUET_TABLES') {
      newSec = {
        id: `sec-tbl-${Date.now()}`,
        name: `Banquet Tables ${nextIdx}`,
        sectionCode: `TBL-${nextIdx}`,
        shapeType: 'BANQUET_TABLES',
        isGeneralAdmission: false,
        capacity: 32,
        rows: 1,
        seatsPerRow: 4,
        posX: 0,
        posY: 180,
        rotation: 0,
        tableCount: 4,
        seatsPerTable: 8,
        tableRadius: 38,
        pricingTier: 'VIP',
        basePrice: 4200,
        displayOrder: nextIdx,
        seats: generateBanquetSeats(4, 8, 38, 0, 180, 'VIP', 4200),
      };
    } else if (shape === 'STADIUM') {
      newSec = {
        id: `sec-stad-${Date.now()}`,
        name: `Stadium Tier ${nextIdx}`,
        sectionCode: `STAD-${nextIdx}`,
        shapeType: 'STADIUM',
        isGeneralAdmission: false,
        capacity: 48,
        rows: 4,
        seatsPerRow: 12,
        posX: 0,
        posY: 340,
        rotation: 0,
        arcRadius: 320,
        arcSweepAngle: 120,
        pricingTier: 'STANDARD',
        basePrice: 1600,
        displayOrder: nextIdx,
        seats: generateStadiumSeats(4, 12, 0, 340, 320, 120, 'STANDARD', 1600),
      };
    } else if (shape === 'GA_FLOOR') {
      newSec = {
        id: `sec-ga-${Date.now()}`,
        name: `General Admission Floor ${nextIdx}`,
        sectionCode: `GA-${nextIdx}`,
        shapeType: 'GA_FLOOR',
        isGeneralAdmission: true,
        capacity: 350,
        rows: 0,
        seatsPerRow: 0,
        posX: 0,
        posY: 140,
        rotation: 0,
        pricingTier: 'STANDARD',
        basePrice: 1200,
        displayOrder: nextIdx,
        seats: [],
      };
    } else {
      newSec = {
        id: `sec-rect-${Date.now()}`,
        name: `Reserved Seating Block ${nextIdx}`,
        sectionCode: `BLK-${nextIdx}`,
        shapeType: 'RECTANGLE',
        isGeneralAdmission: false,
        capacity: 40,
        rows: 4,
        seatsPerRow: 10,
        posX: 0,
        posY: 90,
        rotation: 0,
        pricingTier: 'STANDARD',
        basePrice: 1800,
        displayOrder: nextIdx,
        seats: generateGridSeats(4, 10, 0, 90, 'STANDARD', 1800),
      };
    }

    pushState([...sections, newSec]);
    setSelectedSectionId(newSec.id);
    setSelectedElementId(null);
  };

  // Add architectural element
  const handleAddArchElement = (type: ArchElementType) => {
    const id = `el-${Date.now()}`;
    let newEl: ArchitecturalElement;

    switch (type) {
      case 'STAGE':
        newEl = { id, type: 'STAGE', label: 'MAIN HEADLINE STAGE', posX: 0, posY: -30, width: 340, height: 75, rotation: 0 };
        break;
      case 'FESTIVAL_STAGE':
        newEl = { id, type: 'FESTIVAL_STAGE', label: 'FESTIVAL ARENA STAGE', posX: 0, posY: -45, width: 440, height: 95, rotation: 0 };
        break;
      case 'CENTER_STAGE':
        newEl = { id, type: 'CENTER_STAGE', label: '360° CENTER IN-THE-ROUND', posX: 0, posY: 180, width: 140, height: 140, rotation: 0 };
        break;
      case 'CATWALK':
        newEl = { id, type: 'CATWALK', label: 'Thrust Runway', posX: 0, posY: 45, width: 45, height: 110, rotation: 0 };
        break;
      case 'DJ_BOOTH':
        newEl = { id, type: 'DJ_BOOTH', label: 'DJ BOOTH & SOUND RIG', posX: 0, posY: 20, width: 110, height: 42, rotation: 0 };
        break;
      case 'BASKETBALL_COURT':
        newEl = { id, type: 'BASKETBALL_COURT', label: 'NBA / FIBA BASKETBALL COURT', posX: 0, posY: 180, width: 380, height: 210, rotation: 0 };
        break;
      case 'TENNIS_COURT':
        newEl = { id, type: 'TENNIS_COURT', label: 'TOURNAMENT TENNIS COURT', posX: 0, posY: 180, width: 340, height: 170, rotation: 0 };
        break;
      case 'BOXING_RING':
        newEl = { id, type: 'BOXING_RING', label: 'CHAMPIONSHIP BOXING RING', posX: 0, posY: 180, width: 180, height: 180, rotation: 0 };
        break;
      case 'VOLLEYBALL_COURT':
        newEl = { id, type: 'VOLLEYBALL_COURT', label: 'VOLLEYBALL COURT', posX: 0, posY: 180, width: 280, height: 140, rotation: 0 };
        break;
      case 'SOCCER_PITCH':
        newEl = { id, type: 'SOCCER_PITCH', label: 'FUTSAL / ARENA TURF', posX: 0, posY: 180, width: 400, height: 230, rotation: 0 };
        break;
      case 'GATE':
        newEl = { id, type: 'GATE', label: 'GATE 1 — PUBLIC ENTRANCE', posX: -320, posY: 340, width: 120, height: 36, rotation: 0 };
        break;
      case 'VIP_PORTAL':
        newEl = { id, type: 'VIP_PORTAL', label: 'VIP FAST-TRACK PORTAL', posX: 320, posY: 100, width: 120, height: 36, rotation: 0 };
        break;
      case 'EMERGENCY_EXIT':
        newEl = { id, type: 'EMERGENCY_EXIT', label: 'EMERGENCY FIRE EXIT', posX: 320, posY: 340, width: 110, height: 32, rotation: 0 };
        break;
      case 'TURNSTILE':
        newEl = { id, type: 'TURNSTILE', label: 'SCANNER TURNSTILES', posX: -320, posY: 240, width: 95, height: 32, rotation: 0 };
        break;
      case 'BARRICADE':
        newEl = { id, type: 'BARRICADE', label: 'STAGE SAFETY BARRICADE', posX: 0, posY: 45, width: 360, height: 16, rotation: 0 };
        break;
      case 'BAR':
        newEl = { id, type: 'BAR', label: 'Cocktail Bar & Lounge', posX: -280, posY: 180, width: 90, height: 45, rotation: 0 };
        break;
      case 'SOUND_BOOTH':
        newEl = { id, type: 'SOUND_BOOTH', label: 'Sound & Light FOH', posX: 0, posY: 440, width: 130, height: 42, rotation: 0 };
        break;
      case 'RESTROOM':
        newEl = { id, type: 'RESTROOM', label: 'RESTROOMS & FACILITIES', posX: -340, posY: 440, width: 95, height: 40, rotation: 0 };
        break;
      case 'FIRST_AID':
        newEl = { id, type: 'FIRST_AID', label: 'FIRST AID & MEDICAL', posX: 340, posY: 440, width: 95, height: 40, rotation: 0 };
        break;
      case 'MERCH_STAND':
        newEl = { id, type: 'MERCH_STAND', label: 'OFFICIAL MERCHANDISE', posX: 280, posY: 180, width: 90, height: 45, rotation: 0 };
        break;
      case 'ENTRY':
        newEl = { id, type: 'ENTRY', label: 'Main Entrance Door', posX: -320, posY: 320, width: 85, height: 30, rotation: 0 };
        break;
      case 'EXIT':
        newEl = { id, type: 'EXIT', label: 'Emergency Fire Exit', posX: 320, posY: 320, width: 85, height: 30, rotation: 0 };
        break;
      case 'ACCESSIBLE_RAMP':
        newEl = { id, type: 'ACCESSIBLE_RAMP', label: 'Wheelchair Ramp', posX: -260, posY: 80, width: 70, height: 30, rotation: 0 };
        break;
      default:
        newEl = { id, type: 'LABEL', label: 'Zone Annotation', posX: 0, posY: 200, width: 120, height: 30, rotation: 0 };
    }

    pushState(sections, [...elements, newEl]);
    setSelectedElementId(newEl.id);
    setSelectedSeat(null);
  };

  const handleDuplicateSection = (sec: StudioSection) => {
    const duplicated: StudioSection = {
      ...sec,
      id: `sec-dup-${Date.now()}`,
      name: `${sec.name} (Copy)`,
      sectionCode: `${sec.sectionCode}-CP`,
      posY: sec.posY + 40,
      displayOrder: sections.length + 1,
      seats: sec.seats.map((s) => ({
        ...s,
        coordY: s.coordY + 40,
      })),
    };
    pushState([...sections, duplicated]);
    setSelectedSectionId(duplicated.id);
  };

  const handleDuplicateElement = (el: ArchitecturalElement) => {
    const duplicated: ArchitecturalElement = {
      ...el,
      id: `el-dup-${Date.now()}`,
      label: `${el.label} (Copy)`,
      posX: el.posX + 30,
      posY: el.posY + 30,
    };
    pushState(sections, [...elements, duplicated]);
    setSelectedElementId(duplicated.id);
  };

  const handleRemoveSection = (secId: string) => {
    const updated = sections.filter((s) => s.id !== secId);
    pushState(updated);
    setSelectedSectionId(updated[0]?.id || '');
    setSelectedSeat(null);
  };

  const handleRemoveElement = (elId: string) => {
    const updated = elements.filter((el) => el.id !== elId);
    pushState(sections, updated);
    setSelectedElementId(null);
  };

  const handleRemoveSeat = () => {
    if (!selectedSeat) return;
    updateActiveSection((sec) => {
      const updatedSeats = sec.seats.filter(
        (st) => !(st.rowLabel === selectedSeat.rowLabel && st.seatNumber === selectedSeat.seatNumber)
      );
      return {
        ...sec,
        seats: updatedSeats,
        capacity: sec.isGeneralAdmission ? sec.capacity : updatedSeats.length,
      };
    });
    setSelectedSeat(null);
  };

  const handleAddSeatToSection = () => {
    if (!activeSection || activeSection.isGeneralAdmission) return;
    updateActiveSection((sec) => {
      const rowLabel = selectedSeat ? selectedSeat.rowLabel : 'A';
      const existingInRow = sec.seats.filter((s) => s.rowLabel === rowLabel);
      const nextNum = existingInRow.length + 1;
      const lastSeat = existingInRow[existingInRow.length - 1];
      const newX = lastSeat ? lastSeat.coordX + (sec.seatSpacing || 26) : sec.posX;
      const newY = lastSeat ? lastSeat.coordY : sec.posY;

      const newSeat: StudioSeat = {
        rowLabel,
        seatNumber: String(nextNum),
        coordX: newX,
        coordY: newY,
        tier: sec.pricingTier,
        isAccessible: false,
        isCompanion: false,
        isRestrictedView: false,
        isBlocked: false,
      };

      const newSeats = [...sec.seats, newSeat];
      return {
        ...sec,
        seats: newSeats,
        capacity: newSeats.length,
      };
    });
  };

  const handleAddRowToSection = () => {
    if (!activeSection || activeSection.isGeneralAdmission) return;
    updateActiveSection((sec) => {
      const nextRowCode = String.fromCharCode(65 + sec.rows);
      const seatsCount = sec.seatsPerRow || 10;
      const rowY = sec.posY + sec.rows * (sec.rowSpacing || 28);
      const startX = sec.posX - ((seatsCount - 1) * (sec.seatSpacing || 26)) / 2;

      const newRowSeats: StudioSeat[] = [];
      for (let i = 0; i < seatsCount; i++) {
        newRowSeats.push({
          rowLabel: nextRowCode,
          seatNumber: String(i + 1),
          coordX: startX + i * (sec.seatSpacing || 26),
          coordY: rowY,
          tier: sec.pricingTier,
          isAccessible: false,
          isCompanion: false,
          isRestrictedView: false,
          isBlocked: false,
        });
      }

      const allSeats = [...sec.seats, newRowSeats].flat();
      return {
        ...sec,
        rows: sec.rows + 1,
        seats: allSeats,
        capacity: allSeats.length,
      };
    });
  };

  // Section property updates
  const updateActiveSection = (updater: (s: StudioSection) => StudioSection) => {
    if (!activeSection) return;
    const updated = sections.map((s) => {
      if (s.id === activeSection.id) {
        return updater(s);
      }
      return s;
    });
    pushState(updated);
  };

  // Regenerate seats for active section
  const handleRegenerateSeats = () => {
    updateActiveSection((sec) => {
      let newSeats = sec.seats;
      if (sec.shapeType === 'RECTANGLE') {
        newSeats = generateGridSeats(
          sec.rows,
          sec.seatsPerRow,
          sec.posX,
          sec.posY,
          sec.pricingTier,
          sec.basePrice,
          '',
          sec.rowSpacing || 28,
          sec.seatSpacing || 26
        );
      } else if (sec.shapeType === 'ARC') {
        newSeats = generateArcSeats(
          sec.rows,
          sec.seatsPerRow,
          sec.posX,
          sec.posY,
          sec.arcRadius || 210,
          sec.arcSweepAngle || 110,
          sec.pricingTier,
          sec.basePrice
        );
      } else if (sec.shapeType === 'STADIUM') {
        newSeats = generateStadiumSeats(
          sec.rows,
          sec.seatsPerRow,
          sec.posX,
          sec.posY,
          sec.arcRadius || 320,
          sec.arcSweepAngle || 130,
          sec.pricingTier,
          sec.basePrice
        );
      } else if (sec.shapeType === 'BANQUET_TABLES') {
        newSeats = generateBanquetSeats(
          sec.tableCount || 4,
          sec.seatsPerTable || 8,
          sec.tableRadius || 38,
          sec.posX,
          sec.posY,
          sec.pricingTier,
          sec.basePrice
        );
      }
      return {
        ...sec,
        capacity: sec.isGeneralAdmission ? sec.capacity : newSeats.length,
        seats: newSeats,
      };
    });
    setSelectedSeat(null);
  };

  // Toggle seat blocked
  const handleToggleSeatBlocked = () => {
    if (!selectedSeat) return;
    updateActiveSection((sec) => {
      const updatedSeats = sec.seats.map((st) => {
        if (st.rowLabel === selectedSeat.rowLabel && st.seatNumber === selectedSeat.seatNumber) {
          const nextBlocked = !st.isBlocked;
          setSelectedSeat({ ...selectedSeat, isBlocked: nextBlocked });
          return { ...st, isBlocked: nextBlocked };
        }
        return st;
      });
      return { ...sec, seats: updatedSeats };
    });
  };

  // Toggle seat accessibility
  const handleToggleSeatAccessible = () => {
    if (!selectedSeat) return;
    updateActiveSection((sec) => {
      const updatedSeats = sec.seats.map((st) => {
        if (st.rowLabel === selectedSeat.rowLabel && st.seatNumber === selectedSeat.seatNumber) {
          const nextAcc = !st.isAccessible;
          setSelectedSeat({ ...selectedSeat, isAccessible: nextAcc, isCompanion: nextAcc });
          return { ...st, isAccessible: nextAcc, isCompanion: nextAcc };
        }
        return st;
      });
      return { ...sec, seats: updatedSeats };
    });
  };

  // Update individual seat price override
  const handleSeatPriceOverride = (price: number) => {
    if (!selectedSeat) return;
    updateActiveSection((sec) => {
      const updatedSeats = sec.seats.map((st) => {
        if (st.rowLabel === selectedSeat.rowLabel && st.seatNumber === selectedSeat.seatNumber) {
          setSelectedSeat({ ...selectedSeat, overridePrice: price });
          return { ...st, overridePrice: price };
        }
        return st;
      });
      return { ...sec, seats: updatedSeats };
    });
  };

  // Mouse pan & zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'rect') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedSeat(null);
      setSelectedElementId(null);
    }
  };

  // Smooth wheel navigation: scroll down/up/horizontally for large venues, ctrl+wheel zooms
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prev) => Math.max(0.2, Math.min(2.5, +(prev + zoomDelta).toFixed(2))));
    } else {
      e.preventDefault();
      setPan((prev) => ({
        x: Math.round(prev.x - e.deltaX),
        y: Math.round(prev.y - e.deltaY),
      }));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (isDraggingElement && dragItem) {
      const rawDeltaX = (e.clientX - dragItem.startClientX) / zoom;
      const rawDeltaY = (e.clientY - dragItem.startClientY) / zoom;
      const snap = snapToGrid ? (gridSize || 20) : 1;
      const snappedDeltaX = Math.round(rawDeltaX / snap) * snap;
      const snappedDeltaY = Math.round(rawDeltaY / snap) * snap;

      if (dragItem.type === 'SECTION') {
        const baseSeats = dragItem.initialSeats || [];
        setSections((prevSections) =>
          prevSections.map((s) => {
            if (s.id === dragItem.id && !s.locked) {
              return {
                ...s,
                posX: Math.round(dragItem.initialPosX + snappedDeltaX),
                posY: Math.round(dragItem.initialPosY + snappedDeltaY),
                seats: baseSeats.map((st) => ({
                  ...st,
                  coordX: Math.round(st.coordX + snappedDeltaX),
                  coordY: Math.round(st.coordY + snappedDeltaY),
                })),
              };
            }
            return s;
          })
        );
      } else if (dragItem.type === 'ELEMENT') {
        setElements((prevElements) =>
          prevElements.map((el) => {
            if (el.id === dragItem.id) {
              return {
                ...el,
                posX: Math.round(dragItem.initialPosX + snappedDeltaX),
                posY: Math.round(dragItem.initialPosY + snappedDeltaY),
              };
            }
            return el;
          })
        );
      } else if (dragItem.type === 'SEAT') {
        const [secId, rowLabel, seatNumber] = dragItem.id.split('::');
        const nextX = Math.round(dragItem.initialPosX + snappedDeltaX);
        const nextY = Math.round(dragItem.initialPosY + snappedDeltaY);
        setSections((prevSections) =>
          prevSections.map((s) => {
            if (s.id === secId && !s.locked) {
              return {
                ...s,
                seats: s.seats.map((st) => {
                  if (st.rowLabel === rowLabel && st.seatNumber === seatNumber) {
                    return { ...st, coordX: nextX, coordY: nextY };
                  }
                  return st;
                }),
              };
            }
            return s;
          })
        );
        setSelectedSeat((prev) => (prev ? { ...prev, coordX: nextX, coordY: nextY } : null));
      }
      setHasUnsavedChanges(true);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDraggingElement) {
      setIsDraggingElement(false);
      setDragItem(null);
    }
  };

  // Design validation checks
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];
    const sectionCodes = new Set<string>();

    sections.forEach((sec) => {
      const code = sec.sectionCode.trim().toUpperCase();
      if (!code) warnings.push(`Section "${sec.name}" is missing a unique section code.`);
      if (sectionCodes.has(code)) warnings.push(`Duplicate section code: "${code}". Codes must be globally unique.`);
      sectionCodes.add(code);

      if (sec.basePrice <= 0) warnings.push(`Section "${sec.name}" has base price ₹0. Please assign a valid price.`);

      if (!sec.isGeneralAdmission && sec.seats.length === 0) {
        warnings.push(`Reserved section "${sec.name}" contains 0 seats. Please generate seating layout.`);
      }

      // Check duplicate seat labels
      if (!sec.isGeneralAdmission) {
        const seatKeys = new Set<string>();
        sec.seats.forEach((st) => {
          const key = `${st.rowLabel}-${st.seatNumber}`;
          if (seatKeys.has(key)) {
            warnings.push(`Section "${sec.name}" has duplicate seat identifier: Row ${st.rowLabel} Seat ${st.seatNumber}.`);
          }
          seatKeys.add(key);
        });
      }
    });

    return warnings;
  }, [sections]);

  // Total capacity calculations
  const totalCapacity = sections.reduce(
    (acc, s) => acc + (s.isGeneralAdmission ? s.capacity : s.seats.length),
    0
  );
  const totalBlocked = sections.reduce(
    (acc, s) => acc + s.seats.filter((st) => st.isBlocked).length,
    0
  );
  const totalGA = sections.filter((s) => s.isGeneralAdmission).reduce((acc, s) => acc + s.capacity, 0);
  const totalSeated = totalCapacity - totalGA;

  // Save venue layout to backend with custom naming
  const handleSaveVenue = async (saveAsNew: boolean = false) => {
    if (validationWarnings.length > 0) {
      setError(`Cannot publish layout. Please resolve validation warnings first:\n• ${validationWarnings.join('\n• ')}`);
      return;
    }

    setSaving(true);
    setError(null);
    setSaveSuccess(null);

    const targetName = (customLayoutName || venueName).trim() || 'Custom Venue Layout';

    const payload = {
      name: targetName,
      addressLine1: addressLine1.trim(),
      city: city.trim(),
      state: state.trim(),
      country: 'India',
      postalCode: postalCode.trim(),
      totalCapacity,
      layoutType: totalGA > 0 && totalSeated > 0 ? 'HYBRID' : totalGA > 0 ? 'GENERAL_ADMISSION' : 'RESERVED',
      layoutJson: JSON.stringify({
        sections,
        elements,
        zoom,
        pan,
        version: layoutVersion + 1,
        updatedAt: new Date().toISOString(),
      }),
      layoutVersion: layoutVersion + 1,
      status: 'PUBLISHED',
      sections: sections.map((sec, idx) => ({
        name: sec.name.trim(),
        sectionCode: sec.sectionCode.trim().toUpperCase(),
        capacity: sec.isGeneralAdmission ? sec.capacity : sec.seats.length,
        isGeneralAdmission: sec.isGeneralAdmission,
        displayOrder: idx + 1,
        shapeType: sec.shapeType,
        transformJson: JSON.stringify({
          posX: sec.posX,
          posY: sec.posY,
          rotation: sec.rotation,
          arcRadius: sec.arcRadius,
          arcSweepAngle: sec.arcSweepAngle,
          tableCount: sec.tableCount,
          seatsPerTable: sec.seatsPerTable,
          tableRadius: sec.tableRadius,
        }),
        pricingTier: sec.pricingTier,
        basePrice: sec.basePrice,
        seats: sec.isGeneralAdmission
          ? []
          : sec.seats.map((st, sIdx) => ({
              rowLabel: st.rowLabel.trim().toUpperCase(),
              seatNumber: st.seatNumber.trim(),
              isAccessible: st.isAccessible,
              isCompanion: st.isCompanion,
              gridX: sIdx % 10,
              gridY: Math.floor(sIdx / 10),
              coordX: st.coordX,
              coordY: st.coordY,
              rotation: st.rotation || 0,
              tier: st.tier || sec.pricingTier,
              overridePrice: st.overridePrice || sec.basePrice,
              isBlocked: st.isBlocked,
              isRestrictedView: st.isRestrictedView,
            })),
      })),
    };

    try {
      let savedVenue: VenueDto;
      if (!saveAsNew && initialVenue?.id) {
        const res = await apiClient.put<VenueDto>(`/organizer/venues/${initialVenue.id}`, payload);
        savedVenue = res.data;
      } else {
        const res = await apiClient.post<VenueDto>('/organizer/venues', payload);
        savedVenue = res.data;
      }
      setVenueName(targetName);
      setCustomLayoutName(targetName);
      setLayoutVersion((prev) => prev + 1);
      setSaveSuccess(`Custom venue layout "${targetName}" saved successfully as v${layoutVersion + 1}!`);
      setHasUnsavedChanges(false);
      setIsSaveModalOpen(false);
      if (onSaved) onSaved(savedVenue);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish venue layout to platform');
    } finally {
      setSaving(false);
    }
  };

  // Preview cart item click
  const handlePreviewSeatClick = (sec: StudioSection, seat: StudioSeat) => {
    if (seat.isBlocked) return;
    const seatKey = `${sec.id}-${seat.rowLabel}-${seat.seatNumber}`;
    const exists = previewCart.find((item) => item.seatKey === seatKey);

    if (exists) {
      setPreviewCart(previewCart.filter((item) => item.seatKey !== seatKey));
    } else {
      if (previewCart.length >= 6) {
        alert('Customer seat booking preview: maximum 6 seats allowed per order.');
        return;
      }
      setPreviewCart([
        ...previewCart,
        {
          sectionId: sec.id,
          seatKey,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          price: seat.overridePrice || sec.basePrice,
          tier: seat.tier || sec.pricingTier,
        },
      ]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSeat) {
          handleRemoveSeat();
        } else if (selectedElementId) {
          handleRemoveElement(selectedElementId);
        } else if (selectedSectionId && sections.length > 1) {
          handleRemoveSection(selectedSectionId);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveVenue();
      }
      if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          setSelectedSeat(null);
          setSelectedElementId(null);
        }
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setIsFullScreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSeat, selectedElementId, selectedSectionId, sections, elements, historyIndex, history, isFullScreen]);

  const previewCartTotal = previewCart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div
      style={{
        position: isFullScreen ? 'fixed' : 'relative',
        inset: isFullScreen ? 0 : 'auto',
        zIndex: isFullScreen ? 999 : 'auto',
        backgroundColor: '#f8fafc',
        minHeight: isFullScreen ? '100vh' : 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
        color: '#0f172a',
      }}
    >
      {/* ========================================================
          1. TOP PROFESSIONAL WORKSPACE TOOLBAR
      ======================================================== */}
      <header
        style={{
          height: '54px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexShrink: 0,
          color: '#f8fafc',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {/* Left: Venue Context & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.4)',
              flexShrink: 0,
            }}
          >
            <Compass size={18} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'nowrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#1e293b',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #334155',
              }}
            >
              <span style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Layout:
              </span>
              <input
                type="text"
                value={venueName}
                onChange={(e) => {
                  setVenueName(e.target.value);
                  setCustomLayoutName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  border: 'none',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  minWidth: '160px',
                  maxWidth: '240px',
                }}
                placeholder="Custom Layout Name"
                title="Enter custom name for this layout"
              />
            </div>
            <span
              style={{
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                border: '1px solid #334155',
              }}
            >
              v{layoutVersion}.0
            </span>
            {hasUnsavedChanges ? (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#fbbf24',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fbbf24', display: 'inline-block' }} />
                Unsaved
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#34d399',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }} />
                Saved
              </span>
            )}
            <span
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                color: '#94a3b8',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.68rem',
                fontWeight: 500,
                border: '1px solid #334155',
              }}
            >
              {totalCapacity} Seats • {sections.length} Secs • {elements.length} Structs
            </span>
          </div>
        </div>

        {/* Center: CAD Studio Segmented Control Clusters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0,
            backgroundColor: '#1e293b',
            padding: '3px 6px',
            borderRadius: '8px',
            border: '1px solid #334155',
          }}
        >
          {/* History cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              title="Undo (Ctrl+Z)"
              style={{
                background: 'transparent',
                border: 'none',
                color: historyIndex === 0 ? '#475569' : '#cbd5e1',
                cursor: historyIndex === 0 ? 'not-allowed' : 'pointer',
                padding: '4px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Undo2 size={14} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              style={{
                background: 'transparent',
                border: 'none',
                color: historyIndex >= history.length - 1 ? '#475569' : '#cbd5e1',
                cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
                padding: '4px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Redo2 size={14} />
            </button>
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: '#334155' }} />

          {/* Grid & Snap cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              title="Toggle Magnetic Grid Snapping"
              style={{
                background: snapToGrid ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: snapToGrid ? '1px solid #3b82f6' : '1px solid transparent',
                color: snapToGrid ? '#60a5fa' : '#94a3b8',
                borderRadius: '4px',
                padding: '3px 7px',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
            >
              <Grid size={13} />
              <span>Snap</span>
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: snapToGrid ? '#34d399' : '#64748b',
                }}
              />
            </button>

            <select
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value) || 20)}
              style={{
                padding: '2px 4px',
                border: '1px solid #334155',
                borderRadius: '4px',
                fontSize: '0.7rem',
                backgroundColor: '#0f172a',
                color: '#cbd5e1',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
              title="Grid Spacing Size"
            >
              <option value="10">10px</option>
              <option value="20">20px</option>
              <option value="40">40px</option>
            </select>
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: '#334155' }} />

          {/* Zoom & Recenter cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.15).toFixed(2)))}
              title="Zoom Out"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                handleCenterView();
              }}
              title="Click to reset zoom to 100% and center view"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 4px',
                minWidth: '42px',
                textAlign: 'center',
              }}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
              title="Zoom In"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={handleCenterView}
              title="Recenter Architecture (Keep design perfectly centered)"
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                cursor: 'pointer',
                padding: '3px 7px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              <Compass size={13} />
              <span>Center</span>
            </button>
          </div>
        </div>

        {/* Right: Actions & Publishing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
          <button
            onClick={() => {
              setClearScope('ACTIVE_SECTION');
              setIsClearModalOpen(true);
            }}
            title="Safe Clear Seating Layout (Undoable with Ctrl+Z)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0.4rem 0.65rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>

          <button
            onClick={() => {
              setPreviewMode(!previewMode);
              setSelectedSeat(null);
              setSelectedElementId(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0.4rem 0.75rem',
              backgroundColor: previewMode ? '#2563eb' : '#1e293b',
              border: '1px solid',
              borderColor: previewMode ? '#3b82f6' : '#334155',
              color: '#ffffff',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <Eye size={14} />
            <span>{previewMode ? 'Exit Preview' : 'Customer Preview'}</span>
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? 'Exit Full Screen' : 'Distraction-Free Full Screen'}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              padding: '0.4rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            onClick={() => {
              setCustomLayoutName(venueName);
              setIsSaveModalOpen(true);
            }}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.95rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Custom Layout'}</span>
          </button>
        </div>
      </header>

      {/* Notifications banner */}
      {saveSuccess && (
        <div
          style={{
            padding: '0.65rem 1.5rem',
            backgroundColor: '#ecfdf5',
            borderBottom: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>{saveSuccess}</span>
          </div>
          <button
            onClick={() => setSaveSuccess(null)}
            style={{ background: 'transparent', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.65rem 1.5rem',
            backgroundColor: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} color="#dc2626" />
            <span style={{ whiteSpace: 'pre-line' }}>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================
          2. WORKSPACE BODY: TOOLBOX | CANVAS | INSPECTOR
      ======================================================== */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Fullscreen indicator & exit control */}
        {isFullScreen && (
          <div
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              zIndex: 50,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              color: '#ffffff',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <span>Fullscreen Mode</span>
            <button
              onClick={() => setIsFullScreen(false)}
              style={{
                background: '#334155',
                border: 'none',
                color: '#f8fafc',
                borderRadius: '12px',
                padding: '0.15rem 0.45rem',
                fontSize: '0.7rem',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Exit (Esc)
            </button>
          </div>
        )}

        {/* ----------------------------------------------------
            LEFT TOOLBOX (Hidden in customer preview)
        ---------------------------------------------------- */}
        {!previewMode && (
          isLeftCollapsed ? (
            <div
              onClick={() => setIsLeftCollapsed(false)}
              style={{
                width: '32px',
                backgroundColor: '#f8fafc',
                borderRight: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '0.75rem',
                zIndex: 10,
                cursor: 'pointer',
              }}
              title="Expand Tools Panel"
            >
              <Sliders size={16} color="#64748b" />
              <span
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#64748b',
                  marginTop: '1rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Toolbox
              </span>
            </div>
          ) : (
            <>
              <aside
                style={{
                  width: `${leftPanelWidth}px`,
                  backgroundColor: '#ffffff',
                  borderRight: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  flexShrink: 0,
                  zIndex: 10,
                  position: 'relative',
                }}
              >
                {/* Header with collapse button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.75rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Venue Architect
                  </span>
                  <button
                    onClick={() => setIsLeftCollapsed(true)}
                    title="Collapse Tools Panel"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', padding: '2px 4px' }}
                  >
                    ◀
                  </button>
                </div>
            {/* Toolbox Category Segmented Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1px',
                backgroundColor: '#e2e8f0',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              {[
                { id: 'SHAPES', label: 'Seats', icon: Armchair },
                { id: 'STAGES', label: 'Stages', icon: Music },
                { id: 'COURTS', label: 'Courts', icon: Trophy },
                { id: 'GATES', label: 'Gates', icon: DoorOpen },
                { id: 'AMENITIES', label: 'Services', icon: Sparkles },
                { id: 'TEMPLATES', label: 'Presets', icon: Layers },
                { id: 'SECTIONS', label: `Layers (${sections.length + elements.length})`, icon: Sliders },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setToolboxTab(t.id as any)}
                  style={{
                    padding: '0.5rem 0.2rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    border: 'none',
                    backgroundColor: toolboxTab === t.id ? '#ffffff' : '#f8fafc',
                    color: toolboxTab === t.id ? '#2563eb' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    gridColumn: t.id === 'SECTIONS' ? 'span 2' : undefined,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <t.icon size={13} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div style={{ padding: '0.85rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* TAB 1: SEATING SHAPES */}
              {toolboxTab === 'SHAPES' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Seating Section Shapes
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Click to place</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleAddCustomShape('RECTANGLE')}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.8rem' }}>
                        <Armchair size={14} /> Grid Rows
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Straight rows & numbered seats</span>
                    </button>

                    <button
                      onClick={() => handleAddCustomShape('ARC')}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.8rem' }}>
                        <Layers size={14} /> Curved Arc
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Amphitheatre swept rows</span>
                    </button>

                    <button
                      onClick={() => handleAddCustomShape('BANQUET_TABLES')}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.8rem' }}>
                        <Sliders size={14} /> Round Tables
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Banquet & gala dinner circles</span>
                    </button>

                    <button
                      onClick={() => handleAddCustomShape('STADIUM')}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.8rem' }}>
                        <Maximize2 size={14} /> Stadium Tier
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Upper bowl grandstand tiers</span>
                    </button>

                    <button
                      onClick={() => handleAddCustomShape('GA_FLOOR')}
                      style={{
                        gridColumn: 'span 2',
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.8rem' }}>
                        <Layers size={14} /> General Admission Standing Zone
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Non-reserved floor with designated ticket capacity quota</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: STAGES & PERFORMANCE */}
              {toolboxTab === 'STAGES' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Performance Stages
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>CAD Rigs</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {[
                      { type: 'STAGE', label: 'Main Proscenium Stage', desc: 'Standard headline theatre/concert stage' },
                      { type: 'FESTIVAL_STAGE', label: 'Festival Arena Stage', desc: 'Massive outdoor stage with PA line-arrays & rigging' },
                      { type: 'CENTER_STAGE', label: '360° Center In-The-Round', desc: 'Circular arena center stage with radial walkways' },
                      { type: 'CATWALK', label: 'Catwalk / Thrust Runway', desc: 'Runway extending from main stage into audience floor' },
                      { type: 'DJ_BOOTH', label: 'DJ Booth & Sound Rig', desc: 'Elevated electronic DJ deck with turntables and console' },
                    ].map((stg) => (
                      <button
                        key={stg.type}
                        onClick={() => handleAddArchElement(stg.type as any)}
                        style={{
                          padding: '0.6rem 0.75rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{stg.label}</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{stg.desc}</div>
                        </div>
                        <Plus size={15} color="#2563eb" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: SPORTS COURTS & ARENAS */}
              {toolboxTab === 'COURTS' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Regulation Sports Courts
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Scale Courts</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {[
                      { type: 'BASKETBALL_COURT', label: 'NBA / FIBA Basketball Court', desc: 'Full hardwood court with 3-pt arcs, keys, and hoops' },
                      { type: 'TENNIS_COURT', label: 'Tournament Tennis Court', desc: 'Regulation blue/green court with baseline, service box, and net' },
                      { type: 'BOXING_RING', label: 'Championship Boxing / MMA Ring', desc: 'Square 4-rope competition ring with red & blue corner pads' },
                      { type: 'VOLLEYBALL_COURT', label: 'Regulation Volleyball Court', desc: 'Court with attack lines and center net' },
                      { type: 'SOCCER_PITCH', label: 'Futsal / Turf Soccer Pitch', desc: 'Indoor soccer turf with penalty boxes, spots, and goals' },
                    ].map((crt) => (
                      <button
                        key={crt.type}
                        onClick={() => handleAddArchElement(crt.type as any)}
                        style={{
                          padding: '0.6rem 0.75rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{crt.label}</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{crt.desc}</div>
                        </div>
                        <Plus size={15} color="#2563eb" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: GATES & CIRCULATION */}
              {toolboxTab === 'GATES' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Access & Circulation Gates
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Portals</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {[
                      { type: 'GATE', label: 'Public Entrance Gate', desc: 'Main attendee entrance with lane barriers & signs' },
                      { type: 'VIP_PORTAL', label: 'VIP Priority Fast-Track', desc: 'Dedicated luxury VIP access portal' },
                      { type: 'EMERGENCY_EXIT', label: 'Emergency Fire Exit', desc: 'ISO safety exit marker with egress arrows' },
                      { type: 'TURNSTILE', label: 'Scanner Turnstiles', desc: 'Electronic ticket verification barrier turnstile bank' },
                      { type: 'BARRICADE', label: 'Stage Safety Barricade', desc: 'Heavy-duty steel mojo crowd barrier' },
                      { type: 'ACCESSIBLE_RAMP', label: 'ADA Wheelchair Ramp', desc: 'Graduated slope wheelchair accessibility marker' },
                    ].map((gt) => (
                      <button
                        key={gt.type}
                        onClick={() => handleAddArchElement(gt.type as any)}
                        style={{
                          padding: '0.6rem 0.75rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{gt.label}</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{gt.desc}</div>
                        </div>
                        <Plus size={15} color="#2563eb" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: AMENITIES & SERVICES */}
              {toolboxTab === 'AMENITIES' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Venue Services & Amenities
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Facilities</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {[
                      { type: 'SOUND_BOOTH', label: 'Sound & Lighting FOH', desc: 'Front of house console desk & engineering riser' },
                      { type: 'BAR', label: 'Cocktail Bar & Lounge', desc: 'Refreshment concessions, drink service counter' },
                      { type: 'MERCH_STAND', label: 'Official Merchandise Stand', desc: 'Tour and artist retail merchandise kiosk' },
                      { type: 'RESTROOM', label: 'Restrooms & Sanitation', desc: 'Guest washrooms and ADA facilities' },
                      { type: 'FIRST_AID', label: 'First Aid & Medical Station', desc: 'Emergency paramedic medical booth' },
                      { type: 'LABEL', label: 'Custom Zone Annotation', desc: 'Floating informational text banner or direction tag' },
                    ].map((am) => (
                      <button
                        key={am.type}
                        onClick={() => handleAddArchElement(am.type as any)}
                        style={{
                          padding: '0.6rem 0.75rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{am.label}</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{am.desc}</div>
                        </div>
                        <Plus size={15} color="#2563eb" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: PRESET TEMPLATES */}
              {toolboxTab === 'TEMPLATES' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      10 Enterprise Venue Templates
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#2563eb' }}>Pro Layouts</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => {
                          if (confirm(`Load "${preset.name}" template? This will replace your current canvas elements.`)) {
                            handleApplyPreset(key);
                          }
                        }}
                        style={{
                          padding: '0.75rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{preset.name}</span>
                          <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 600 }}>{preset.category}</span>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', lineHeight: 1.3 }}>
                          {preset.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: COMPLETE LAYERS & STRUCTURES HIERARCHY */}
              {toolboxTab === 'SECTIONS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Seating Sections list */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Seating Sections ({sections.length})
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {sections.map((sec) => (
                        <div
                          key={sec.id}
                          onClick={() => {
                            setSelectedSectionId(sec.id);
                            setSelectedElementId(null);
                            setSelectedSeat(null);
                          }}
                          style={{
                            padding: '0.55rem 0.65rem',
                            borderRadius: '6px',
                            border: selectedSectionId === sec.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            backgroundColor: selectedSectionId === sec.id ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{sec.name}</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              {sec.sectionCode} • {sec.isGeneralAdmission ? `${sec.capacity} GA` : `${sec.seats.length} seats`} • ₹{sec.basePrice}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.2rem' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLockSection(sec.id);
                              }}
                              style={{ padding: '0.25rem', background: 'transparent', border: 'none', color: sec.locked ? '#2563eb' : '#94a3b8', cursor: 'pointer' }}
                              title={sec.locked ? 'Unlock' : 'Lock'}
                            >
                              {sec.locked ? <Lock size={13} /> : <Unlock size={13} />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateSection(sec);
                              }}
                              style={{ padding: '0.25rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                              title="Duplicate section"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSection(sec.id);
                              }}
                              style={{ padding: '0.25rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                              title="Delete section"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Architectural Structures & Courts list */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Structures & Courts ({elements.length})
                      </span>
                    </div>
                    {elements.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem' }}>
                        No structures added. Choose from Stages, Courts, or Gates tabs.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {elements.map((el) => (
                          <div
                            key={el.id}
                            onClick={() => {
                              setSelectedElementId(el.id);
                              setSelectedSeat(null);
                            }}
                            style={{
                              padding: '0.55rem 0.65rem',
                              borderRadius: '6px',
                              border: selectedElementId === el.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                              backgroundColor: selectedElementId === el.id ? '#eff6ff' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{el.label}</div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                {el.type} • {el.width}×{el.height}px
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateElement(el);
                                }}
                                style={{ padding: '0.25rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                                title="Duplicate element"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveElement(el.id);
                                }}
                                style={{ padding: '0.25rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                title="Delete element"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
          {/* Draggable Divider for Left Panel */}
          <div
            onMouseDown={() => setIsResizingLeft(true)}
            style={{
              width: '6px',
              cursor: 'col-resize',
              backgroundColor: isResizingLeft ? '#2563eb' : 'transparent',
              transition: 'background-color 0.15s',
              zIndex: 20,
              userSelect: 'none',
            }}
            title="Drag to resize toolbox"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#93c5fd')}
            onMouseLeave={(e) => !isResizingLeft && (e.currentTarget.style.backgroundColor = 'transparent')}
          />
        </>
      )
    )}

        {/* ----------------------------------------------------
            CENTRAL SPATIOUS CANVAS (Large, Pannable, Zoomable)
        ---------------------------------------------------- */}
        <main
          ref={mainRef as any}
          style={{
            flex: 1,
            position: 'relative',
            backgroundColor: '#f8fafc',
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Subtle Grid Background Pattern */}
          <svg
            ref={canvasRef}
            width="100%"
            height="100%"
            style={{ display: 'block', userSelect: 'none' }}
          >
            <defs>
              <pattern id="grid-pattern" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <circle cx={gridSize / 2} cy={gridSize / 2} r="1" fill="#cbd5e1" opacity="0.6" />
              </pattern>

              {/* Hardwood basketball court parquet pattern */}
              <pattern id="court-hardwood" width="50" height="14" patternUnits="userSpaceOnUse">
                <rect width="50" height="14" fill="#d97706" />
                <line x1="0" y1="0" x2="50" y2="0" stroke="#b45309" strokeWidth="0.7" opacity="0.8" />
                <line x1="0" y1="7" x2="50" y2="7" stroke="#b45309" strokeWidth="0.7" opacity="0.5" />
                <line x1="25" y1="0" x2="25" y2="7" stroke="#b45309" strokeWidth="0.6" opacity="0.6" />
                <line x1="50" y1="7" x2="50" y2="14" stroke="#b45309" strokeWidth="0.6" opacity="0.6" />
              </pattern>

              {/* Soccer / Turf Pitch Stripes Pattern */}
              <pattern id="turf-stripes" width="40" height="100" patternUnits="userSpaceOnUse">
                <rect width="20" height="100" fill="#15803d" />
                <rect x="20" width="20" height="100" fill="#16a34a" />
              </pattern>

              {/* Festival Stage Truss Gradient */}
              <linearGradient id="festival-stage-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="60%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* VIP Gold Gradient */}
              <linearGradient id="vip-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>

              {/* Fire Exit Green Gradient */}
              <linearGradient id="fire-exit-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#15803d" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>

              {/* Mojo Barricade Steel Pattern */}
              <pattern id="barricade-steel" width="8" height="16" patternUnits="userSpaceOnUse">
                <rect width="8" height="16" fill="#334155" />
                <line x1="4" y1="0" x2="4" y2="16" stroke="#94a3b8" strokeWidth="1.5" />
              </pattern>
            </defs>

            {/* Grid canvas background */}
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />

            {/* Transformed Stage / Seating Group */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Orientation marker: Stage direction banner */}
              <g transform="translate(-160, -115)">
                <rect x="0" y="0" width="320" height="24" rx="12" fill="#0f172a" opacity="0.85" />
                <text x="160" y="16" textAnchor="middle" fill="#94a3b8" fontSize="10.5" fontWeight="800" letterSpacing="0.12em">
                  ▲ PERFORMANCE STAGE DIRECTION ▲
                </text>
              </g>

              {/* Empty Canvas Guidance when empty */}
              {sections.length === 0 && elements.length === 0 && (
                <g transform="translate(-180, 40)">
                  <rect
                    width="360"
                    height="170"
                    rx="12"
                    fill="#ffffff"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    opacity="0.9"
                  />
                  <text x="180" y="55" textAnchor="middle" fill="#0f172a" fontSize="15" fontWeight="800">
                    Empty Venue Layout
                  </text>
                  <text x="180" y="82" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="500">
                    Select Seats, Stages, Courts or Gates
                  </text>
                  <text x="180" y="104" textAnchor="middle" fill="#94a3b8" fontSize="11">
                    from the left Toolbox to design your custom layout
                  </text>
                  <rect
                    x="100"
                    y="122"
                    width="160"
                    height="30"
                    rx="6"
                    fill="#2563eb"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleAddCustomShape('RECTANGLE')}
                  />
                  <text
                    x="180"
                    y="141"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                    style={{ pointerEvents: 'none' }}
                  >
                    + Add Seating Block
                  </text>
                </g>
              )}

              {/* RENDER ARCHITECTURAL ELEMENTS (Stages, Courts, Gates, Amenities) */}
              {elements.map((el) => {
                const isSelected = selectedElementId === el.id;
                const selStroke = isSelected ? '#2563eb' : undefined;
                const selFilter = isSelected ? 'drop-shadow(0 0 10px rgba(37, 99, 235, 0.7))' : undefined;

                return (
                  <g
                    key={el.id}
                    transform={`translate(${el.posX - el.width / 2}, ${el.posY - el.height / 2}) rotate(${el.rotation}, ${el.width / 2}, ${el.height / 2})`}
                    style={{ cursor: 'pointer', filter: selFilter }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!previewMode) {
                        setSelectedElementId(el.id);
                        setSelectedSeat(null);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!previewMode && e.button === 0) {
                        e.stopPropagation();
                        setIsDraggingElement(true);
                        setDragItem({
                          type: 'ELEMENT',
                          id: el.id,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          initialPosX: el.posX,
                          initialPosY: el.posY,
                        });
                        setSelectedElementId(el.id);
                        setSelectedSeat(null);
                      }
                    }}
                  >
                    {/* 1. MAIN PROSCENIUM STAGE */}
                    {el.type === 'STAGE' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="8"
                          fill="url(#festival-stage-grad)"
                          stroke={selStroke || '#0f172a'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        {/* Wooden front apron */}
                        <rect
                          x="10"
                          y={el.height - 14}
                          width={el.width - 20}
                          height="10"
                          rx="4"
                          fill="#d97706"
                          opacity="0.85"
                        />
                        {/* Left & Right Monitor Speakers */}
                        <rect x="12" y="8" width="16" height="24" rx="2" fill="#020617" stroke="#475569" strokeWidth="1" />
                        <circle cx="20" cy="16" r="4" fill="#38bdf8" opacity="0.7" />
                        <rect x={el.width - 28} y="8" width="16" height="24" rx="2" fill="#020617" stroke="#475569" strokeWidth="1" />
                        <circle cx={el.width - 20} cy="16" r="4" fill="#38bdf8" opacity="0.7" />
                        <text
                          x={el.width / 2}
                          y={el.height / 2}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="13"
                          fontWeight="800"
                          letterSpacing="0.08em"
                        >
                          {el.label}
                        </text>
                      </>
                    )}

                    {/* 2. FESTIVAL ARENA STAGE (Massive outdoor rig with PA line arrays) */}
                    {el.type === 'FESTIVAL_STAGE' && (
                      <>
                        {/* Main Stage Enclosure */}
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="8"
                          fill="#020617"
                          stroke={selStroke || '#38bdf8'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        {/* Stage Deck */}
                        <rect
                          x="50"
                          y="10"
                          width={el.width - 100}
                          height={el.height - 20}
                          rx="6"
                          fill="#1e293b"
                          stroke="#475569"
                          strokeWidth="1.5"
                        />
                        {/* Left PA Line Array Tower */}
                        <g transform="translate(8, 8)">
                          <rect width="34" height={el.height - 16} rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" />
                          {[0, 1, 2, 3, 4].map((i) => (
                            <rect key={i} x="4" y={6 + i * 14} width="26" height="10" rx="2" fill="#020617" stroke="#38bdf8" strokeWidth="0.8" />
                          ))}
                          <text x="17" y={el.height - 20} textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="800">PA L</text>
                        </g>
                        {/* Right PA Line Array Tower */}
                        <g transform={`translate(${el.width - 42}, 8)`}>
                          <rect width="34" height={el.height - 16} rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" />
                          {[0, 1, 2, 3, 4].map((i) => (
                            <rect key={i} x="4" y={6 + i * 14} width="26" height="10" rx="2" fill="#020617" stroke="#38bdf8" strokeWidth="0.8" />
                          ))}
                          <text x="17" y={el.height - 20} textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="800">PA R</text>
                        </g>
                        {/* Overhead Lighting Truss dots */}
                        <line x1="56" y1="16" x2={el.width - 56} y2="16" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 3}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="13"
                          fontWeight="800"
                          letterSpacing="0.08em"
                        >
                          {el.label}
                        </text>
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 18}
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="9"
                          fontWeight="700"
                          letterSpacing="0.05em"
                        >
                          OUTDOOR FESTIVAL CONCERT RIG
                        </text>
                      </>
                    )}

                    {/* 3. 360° CENTER IN-THE-ROUND STAGE */}
                    {el.type === 'CENTER_STAGE' && (
                      <>
                        <circle
                          cx={el.width / 2}
                          cy={el.height / 2}
                          r={Math.min(el.width, el.height) / 2}
                          fill="#0f172a"
                          stroke={selStroke || '#6366f1'}
                          strokeWidth={isSelected ? '3.5' : '2'}
                        />
                        <circle
                          cx={el.width / 2}
                          cy={el.height / 2}
                          r={Math.min(el.width, el.height) * 0.38}
                          fill="#1e293b"
                          stroke="#a855f7"
                          strokeWidth="2"
                        />
                        <circle
                          cx={el.width / 2}
                          cy={el.height / 2}
                          r={Math.min(el.width, el.height) * 0.22}
                          fill="#3b82f6"
                        />
                        {/* 4 Radial catwalk spokes */}
                        <line x1={el.width / 2} y1="0" x2={el.width / 2} y2={el.height} stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
                        <line x1="0" y1={el.height / 2} x2={el.width} y2={el.height / 2} stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="800"
                        >
                          360° STAGE
                        </text>
                      </>
                    )}

                    {/* 4. CATWALK / THRUST RUNWAY */}
                    {el.type === 'CATWALK' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="#1e293b"
                          stroke={selStroke || '#64748b'}
                          strokeWidth={isSelected ? '3' : '1.5'}
                        />
                        {/* Runway edge lights */}
                        <line x1="3" y1="4" x2="3" y2={el.height - 4} stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 6" />
                        <line x1={el.width - 3} y1="4" x2={el.width - 3} y2={el.height - 4} stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 6" />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="10"
                          fontWeight="700"
                        >
                          RUNWAY
                        </text>
                      </>
                    )}

                    {/* 5. DJ BOOTH & SOUND RIG */}
                    {el.type === 'DJ_BOOTH' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="6"
                          fill="#0f172a"
                          stroke={selStroke || '#a855f7'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        {/* Dual Jog Wheels / CDJs */}
                        <circle cx={el.width * 0.28} cy={el.height / 2} r="10" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                        <circle cx={el.width * 0.28} cy={el.height / 2} r="3" fill="#38bdf8" />
                        <circle cx={el.width * 0.72} cy={el.height / 2} r="10" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                        <circle cx={el.width * 0.72} cy={el.height / 2} r="3" fill="#38bdf8" />
                        {/* Central Mixer Console */}
                        <rect x={el.width * 0.44} y={el.height * 0.25} width={el.width * 0.12} height={el.height * 0.5} fill="#312e81" rx="2" />
                        <text
                          x={el.width / 2}
                          y={el.height - 5}
                          textAnchor="middle"
                          fill="#c084fc"
                          fontSize="8.5"
                          fontWeight="800"
                        >
                          🎧 DJ BOOTH
                        </text>
                      </>
                    )}

                    {/* 6. NBA / FIBA BASKETBALL COURT (Hardwood floor with 3-pt arcs, keys, and hoops) */}
                    {el.type === 'BASKETBALL_COURT' && (
                      <>
                        {/* Hardwood court surface */}
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="url(#court-hardwood)"
                          stroke={selStroke || '#78350f'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        {/* Court Perimeter Boundary line */}
                        <rect
                          x="8"
                          y="8"
                          width={el.width - 16}
                          height={el.height - 16}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        {/* Half-Court Line */}
                        <line x1={el.width / 2} y1="8" x2={el.width / 2} y2={el.height - 8} stroke="#ffffff" strokeWidth="2" />
                        {/* Center Jump Circle */}
                        <circle
                          cx={el.width / 2}
                          cy={el.height / 2}
                          r={el.height * 0.18}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        {/* Left Key (Free Throw Lane) */}
                        <rect
                          x="8"
                          y={el.height / 2 - el.height * 0.18}
                          width={el.width * 0.18}
                          height={el.height * 0.36}
                          fill="#b45309"
                          opacity="0.8"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={8 + el.width * 0.18}
                          cy={el.height / 2}
                          r={el.height * 0.18}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {/* Left 3-Point Arc */}
                        <path
                          d={`M 8 ${el.height * 0.18} L ${el.width * 0.12} ${el.height * 0.18} A ${el.height * 0.38} ${el.height * 0.38} 0 0 1 ${el.width * 0.12} ${el.height * 0.82} L 8 ${el.height * 0.82}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {/* Left Backboard & Hoop */}
                        <line x1="22" y1={el.height / 2 - 14} x2="22" y2={el.height / 2 + 14} stroke="#ffffff" strokeWidth="3" />
                        <circle cx="28" cy={el.height / 2} r="5" fill="none" stroke="#ea580c" strokeWidth="2" />

                        {/* Right Key (Free Throw Lane) */}
                        <rect
                          x={el.width - 8 - el.width * 0.18}
                          y={el.height / 2 - el.height * 0.18}
                          width={el.width * 0.18}
                          height={el.height * 0.36}
                          fill="#b45309"
                          opacity="0.8"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={el.width - 8 - el.width * 0.18}
                          cy={el.height / 2}
                          r={el.height * 0.18}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {/* Right 3-Point Arc */}
                        <path
                          d={`M ${el.width - 8} ${el.height * 0.18} L ${el.width - el.width * 0.12} ${el.height * 0.18} A ${el.height * 0.38} ${el.height * 0.38} 0 0 0 ${el.width - el.width * 0.12} ${el.height * 0.82} L ${el.width - 8} ${el.height * 0.82}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {/* Right Backboard & Hoop */}
                        <line x1={el.width - 22} y1={el.height / 2 - 14} x2={el.width - 22} y2={el.height / 2 + 14} stroke="#ffffff" strokeWidth="3" />
                        <circle cx={el.width - 28} cy={el.height / 2} r="5" fill="none" stroke="#ea580c" strokeWidth="2" />

                        {/* Title text */}
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="800"
                          letterSpacing="0.08em"
                        >
                          FIBA / NBA BASKETBALL
                        </text>
                      </>
                    )}

                    {/* 7. TOURNAMENT TENNIS COURT (US Open Style Blue Court with Net) */}
                    {el.type === 'TENNIS_COURT' && (
                      <>
                        {/* Outer apron (Green or Deep Blue) */}
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="#1e3a8a"
                          stroke={selStroke || '#1d4ed8'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        {/* Inner Blue Playing Surface */}
                        <rect
                          x={el.width * 0.08}
                          y={el.height * 0.1}
                          width={el.width * 0.84}
                          height={el.height * 0.8}
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        {/* Singles Sidelines */}
                        <line x1={el.width * 0.08} y1={el.height * 0.22} x2={el.width * 0.92} y2={el.height * 0.22} stroke="#ffffff" strokeWidth="1.5" />
                        <line x1={el.width * 0.08} y1={el.height * 0.78} x2={el.width * 0.92} y2={el.height * 0.78} stroke="#ffffff" strokeWidth="1.5" />
                        {/* Service Boxes Lines */}
                        <line x1={el.width * 0.28} y1={el.height * 0.22} x2={el.width * 0.28} y2={el.height * 0.78} stroke="#ffffff" strokeWidth="1.5" />
                        <line x1={el.width * 0.72} y1={el.height * 0.22} x2={el.width * 0.72} y2={el.height * 0.78} stroke="#ffffff" strokeWidth="1.5" />
                        {/* Center Service Line */}
                        <line x1={el.width * 0.28} y1={el.height / 2} x2={el.width * 0.72} y2={el.height / 2} stroke="#ffffff" strokeWidth="1.5" />
                        {/* Center Tennis Net & Posts */}
                        <line x1={el.width / 2} y1={el.height * 0.06} x2={el.width / 2} y2={el.height * 0.94} stroke="#f8fafc" strokeWidth="3" strokeDasharray="3 2" />
                        <circle cx={el.width / 2} cy={el.height * 0.06} r="3" fill="#f8fafc" />
                        <circle cx={el.width / 2} cy={el.height * 0.94} r="3" fill="#f8fafc" />
                        <text
                          x={el.width / 2}
                          y={el.height * 0.18}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="800"
                          letterSpacing="0.08em"
                        >
                          CHAMPIONSHIP TENNIS COURT
                        </text>
                      </>
                    )}

                    {/* 8. CHAMPIONSHIP BOXING / MMA RING (Square 4-rope ring with red & blue corners) */}
                    {el.type === 'BOXING_RING' && (
                      <>
                        {/* Ring Apron */}
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="#1e293b"
                          stroke={selStroke || '#475569'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        {/* Canvas Surface */}
                        <rect
                          x="16"
                          y="16"
                          width={el.width - 32}
                          height={el.height - 32}
                          fill="#f1f5f9"
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                        />
                        {/* 4 Tensioned Ropes (North, South, East, West) */}
                        {[22, 26, 30].map((inset, idx) => (
                          <rect
                            key={idx}
                            x={inset}
                            y={inset}
                            width={el.width - inset * 2}
                            height={el.height - inset * 2}
                            fill="none"
                            stroke={idx === 0 ? '#ef4444' : idx === 1 ? '#ffffff' : '#3b82f6'}
                            strokeWidth="1.5"
                          />
                        ))}
                        {/* Red Corner (Top-Left) */}
                        <polygon points="12,12 36,12 12,36" fill="#ef4444" />
                        <text x="24" y="24" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="900">RED</text>
                        {/* Blue Corner (Bottom-Right) */}
                        <polygon
                          points={`${el.width - 12},${el.height - 12} ${el.width - 36},${el.height - 12} ${el.width - 12},${el.height - 36}`}
                          fill="#2563eb"
                        />
                        <text x={el.width - 24} y={el.height - 18} textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="900">BLUE</text>
                        {/* Neutral White Corners */}
                        <polygon points={`${el.width - 12},12 ${el.width - 30},12 ${el.width - 12},30`} fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
                        <polygon points={`12,${el.height - 12} 30,${el.height - 12} 12,${el.height - 30}`} fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#0f172a"
                          fontSize="11"
                          fontWeight="800"
                        >
                          BOXING / MMA RING
                        </text>
                      </>
                    )}

                    {/* 9. REGULATION VOLLEYBALL COURT */}
                    {el.type === 'VOLLEYBALL_COURT' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="#f97316"
                          stroke={selStroke || '#ea580c'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        {/* Playing boundary */}
                        <rect x="8" y="8" width={el.width - 16} height={el.height - 16} fill="none" stroke="#ffffff" strokeWidth="2" />
                        {/* Center Net */}
                        <line x1={el.width / 2} y1="6" x2={el.width / 2} y2={el.height - 6} stroke="#ffffff" strokeWidth="3" strokeDasharray="3 2" />
                        {/* Attack Lines (3-meter lines) */}
                        <line x1={el.width / 2 - el.width * 0.17} y1="8" x2={el.width / 2 - el.width * 0.17} y2={el.height - 8} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 4" />
                        <line x1={el.width / 2 + el.width * 0.17} y1="8" x2={el.width / 2 + el.width * 0.17} y2={el.height - 8} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 4" />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="800"
                        >
                          VOLLEYBALL COURT
                        </text>
                      </>
                    )}

                    {/* 10. FUTSAL / INDOOR SOCCER PITCH */}
                    {el.type === 'SOCCER_PITCH' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="6"
                          fill="url(#turf-stripes)"
                          stroke={selStroke || '#15803d'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        {/* Outer White Boundary */}
                        <rect x="8" y="8" width={el.width - 16} height={el.height - 16} fill="none" stroke="#ffffff" strokeWidth="2" />
                        {/* Halfway Line */}
                        <line x1={el.width / 2} y1="8" x2={el.width / 2} y2={el.height - 8} stroke="#ffffff" strokeWidth="2" />
                        {/* Center Circle & Spot */}
                        <circle cx={el.width / 2} cy={el.height / 2} r={el.height * 0.22} fill="none" stroke="#ffffff" strokeWidth="2" />
                        <circle cx={el.width / 2} cy={el.height / 2} r="3" fill="#ffffff" />
                        {/* Left Penalty Area */}
                        <rect x="8" y={el.height / 2 - el.height * 0.28} width={el.width * 0.18} height={el.height * 0.56} fill="none" stroke="#ffffff" strokeWidth="1.5" />
                        {/* Right Penalty Area */}
                        <rect x={el.width - 8 - el.width * 0.18} y={el.height / 2 - el.height * 0.28} width={el.width * 0.18} height={el.height * 0.56} fill="none" stroke="#ffffff" strokeWidth="1.5" />
                        <text
                          x={el.width / 2}
                          y={el.height * 0.2}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="800"
                        >
                          FUTSAL / ARENA TURF
                        </text>
                      </>
                    )}

                    {/* 11. PUBLIC ENTRANCE GATE */}
                    {el.type === 'GATE' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="6"
                          fill="#ecfdf5"
                          stroke={selStroke || '#10b981'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        <circle cx="16" cy={el.height / 2} r="5" fill="#10b981" />
                        <text
                          x={el.width / 2 + 6}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#065f46"
                          fontSize="10"
                          fontWeight="800"
                          letterSpacing="0.04em"
                        >
                          🚪 {el.label}
                        </text>
                      </>
                    )}

                    {/* 12. VIP FAST-TRACK PORTAL */}
                    {el.type === 'VIP_PORTAL' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="6"
                          fill="#fffbeb"
                          stroke={selStroke || '#f59e0b'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#b45309"
                          fontSize="10"
                          fontWeight="800"
                          letterSpacing="0.04em"
                        >
                          ⭐ {el.label}
                        </text>
                      </>
                    )}

                    {/* 13. EMERGENCY FIRE EXIT */}
                    {el.type === 'EMERGENCY_EXIT' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="url(#fire-exit-grad)"
                          stroke={selStroke || '#14532d'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="800"
                          letterSpacing="0.04em"
                        >
                          🏃 EMERGENCY EXIT ➔
                        </text>
                      </>
                    )}

                    {/* 14. SCANNER TURNSTILES */}
                    {el.type === 'TURNSTILE' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="#f8fafc"
                          stroke={selStroke || '#64748b'}
                          strokeWidth={isSelected ? '3' : '1.5'}
                        />
                        {/* 3 Turnstile lane gates */}
                        <line x1={el.width * 0.33} y1="4" x2={el.width * 0.33} y2={el.height - 4} stroke="#94a3b8" strokeWidth="2" />
                        <line x1={el.width * 0.66} y1="4" x2={el.width * 0.66} y2={el.height - 4} stroke="#94a3b8" strokeWidth="2" />
                        <circle cx={el.width * 0.16} cy={el.height / 2} r="3" fill="#10b981" />
                        <circle cx={el.width * 0.5} cy={el.height / 2} r="3" fill="#10b981" />
                        <circle cx={el.width * 0.84} cy={el.height / 2} r="3" fill="#10b981" />
                        <text
                          x={el.width / 2}
                          y={el.height - 4}
                          textAnchor="middle"
                          fill="#334155"
                          fontSize="7"
                          fontWeight="700"
                        >
                          TURNSTILES
                        </text>
                      </>
                    )}

                    {/* 15. STAGE SAFETY BARRICADE (Mojo barricade) */}
                    {el.type === 'BARRICADE' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="2"
                          fill="url(#barricade-steel)"
                          stroke={selStroke || '#475569'}
                          strokeWidth={isSelected ? '2.5' : '1'}
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 3}
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="8.5"
                          fontWeight="800"
                          letterSpacing="0.08em"
                        >
                          /// STAGE SAFETY BARRICADE ///
                        </text>
                      </>
                    )}

                    {/* 16. BAR & HOSPITALITY LOUNGE */}
                    {el.type === 'BAR' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="6"
                          fill="#fef3c7"
                          stroke={selStroke || '#f59e0b'}
                          strokeWidth={isSelected ? '3' : '1.5'}
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#b45309"
                          fontSize="10.5"
                          fontWeight="700"
                        >
                          🍸 {el.label}
                        </text>
                      </>
                    )}

                    {/* 17. SOUND & LIGHTING FOH */}
                    {el.type === 'SOUND_BOOTH' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="6"
                          fill="#e2e8f0"
                          stroke={selStroke || '#64748b'}
                          strokeWidth={isSelected ? '3' : '1.5'}
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#334155"
                          fontSize="10"
                          fontWeight="700"
                        >
                          🎛️ {el.label}
                        </text>
                      </>
                    )}

                    {/* 18. OFFICIAL MERCHANDISE STAND */}
                    {el.type === 'MERCH_STAND' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="6"
                          fill="#fdf2f8"
                          stroke={selStroke || '#ec4899'}
                          strokeWidth={isSelected ? '3' : '1.5'}
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#be185d"
                          fontSize="10"
                          fontWeight="700"
                        >
                          👕 {el.label}
                        </text>
                      </>
                    )}

                    {/* 19. RESTROOMS & SANITATION */}
                    {el.type === 'RESTROOM' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="#eff6ff"
                          stroke={selStroke || '#3b82f6'}
                          strokeWidth={isSelected ? '3' : '1.5'}
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#1d4ed8"
                          fontSize="10"
                          fontWeight="700"
                        >
                          🚻 {el.label}
                        </text>
                      </>
                    )}

                    {/* 20. FIRST AID & MEDICAL */}
                    {el.type === 'FIRST_AID' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="#fef2f2"
                          stroke={selStroke || '#ef4444'}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#dc2626"
                          fontSize="10"
                          fontWeight="800"
                        >
                          ✚ {el.label}
                        </text>
                      </>
                    )}

                    {/* 21. ENTRY & EXIT (Legacy markers) */}
                    {(el.type === 'ENTRY' || el.type === 'EXIT') && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill={el.type === 'ENTRY' ? '#ecfdf5' : '#fef2f2'}
                          stroke={selStroke || (el.type === 'ENTRY' ? '#10b981' : '#ef4444')}
                          strokeWidth={isSelected ? '3' : '1.5'}
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill={el.type === 'ENTRY' ? '#047857' : '#b91c1c'}
                          fontSize="10"
                          fontWeight="700"
                        >
                          {el.label}
                        </text>
                      </>
                    )}

                    {/* 22. ACCESSIBLE RAMP */}
                    {el.type === 'ACCESSIBLE_RAMP' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="#ecfdf5"
                          stroke={selStroke || '#10b981'}
                          strokeWidth={isSelected ? '3' : '1.5'}
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#047857"
                          fontSize="10"
                          fontWeight="700"
                        >
                          ♿ Ramp
                        </text>
                      </>
                    )}

                    {/* 23. LABEL (Fallback Annotation Banner) */}
                    {el.type === 'LABEL' && (
                      <>
                        <rect
                          width={el.width}
                          height={el.height}
                          rx="4"
                          fill="#f8fafc"
                          stroke={selStroke || '#94a3b8'}
                          strokeWidth={isSelected ? '2' : '1'}
                          strokeDasharray="4 2"
                        />
                        <text
                          x={el.width / 2}
                          y={el.height / 2 + 4}
                          textAnchor="middle"
                          fill="#475569"
                          fontSize="10"
                          fontWeight="600"
                        >
                          🏷️ {el.label}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

              {/* RENDER SECTIONS & SEATS */}
              {sections.map((sec) => {
                const isSecActive = selectedSectionId === sec.id && !previewMode;
                const tierInfo = TIER_CONFIG[sec.pricingTier] || TIER_CONFIG.STANDARD;

                return (
                  <g
                    key={sec.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!previewMode) {
                        setSelectedSectionId(sec.id);
                        setSelectedElementId(null);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!previewMode && e.button === 0) {
                        // Allow dragging if clicked on section border
                        setIsDraggingElement(true);
                        setDragItem({
                          type: 'SECTION',
                          id: sec.id,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          initialPosX: sec.posX,
                          initialPosY: sec.posY,
                          initialSeats: sec.seats.map((s) => ({ ...s })),
                        });
                        setSelectedSectionId(sec.id);
                        setSelectedElementId(null);
                      }
                    }}
                  >
                    {/* General Admission Section Container */}
                    {sec.isGeneralAdmission && (
                      <g transform={`translate(${sec.posX - 180}, ${sec.posY - 60})`}>
                        <rect
                          width="360"
                          height="120"
                          rx="12"
                          fill="#f1f5f9"
                          stroke={isSecActive ? '#2563eb' : '#cbd5e1'}
                          strokeWidth={isSecActive ? '3' : '1.5'}
                          strokeDasharray={isSecActive ? 'none' : '6 4'}
                        />
                        <text x="180" y="55" textAnchor="middle" fill="#0f172a" fontSize="14" fontWeight="800">
                          {sec.name}
                        </text>
                        <text x="180" y="78" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="600">
                          General Admission Standing • Quota: {sec.capacity} Attendees • ₹{sec.basePrice}
                        </text>
                      </g>
                    )}

                    {/* Banquet Round Table Surfaces */}
                    {sec.shapeType === 'BANQUET_TABLES' &&
                      sec.seats.length > 0 &&
                      (() => {
                        const tables = new Set(sec.seats.map((s) => s.tableIndex ?? 0));
                        return Array.from(tables).map((tIdx) => {
                          const tableSeats = sec.seats.filter((s) => (s.tableIndex ?? 0) === tIdx);
                          if (tableSeats.length === 0) return null;
                          const avgX = tableSeats.reduce((sum, s) => sum + s.coordX, 0) / tableSeats.length;
                          const avgY = tableSeats.reduce((sum, s) => sum + s.coordY, 0) / tableSeats.length;
                          const radius = sec.tableRadius || 38;

                          return (
                            <g key={`table-${tIdx}`} transform={`translate(${avgX}, ${avgY})`}>
                              <circle
                                r={radius}
                                fill="#ffffff"
                                stroke={isSecActive ? '#2563eb' : '#cbd5e1'}
                                strokeWidth="2"
                                filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))"
                              />
                              <text
                                y="4"
                                textAnchor="middle"
                                fill="#0f172a"
                                fontSize="12"
                                fontWeight="800"
                              >
                                T{tIdx + 1}
                              </text>
                            </g>
                          );
                        });
                      })()}

                    {/* Individual Seats Rendering */}
                    {!sec.isGeneralAdmission &&
                      sec.seats.map((st) => {
                        const seatKey = `${sec.id}-${st.rowLabel}-${st.seatNumber}`;
                        const isSelectedInPreview = previewCart.some((item) => item.seatKey === seatKey);
                        const isSelectedInDesigner =
                          selectedSeat?.rowLabel === st.rowLabel &&
                          selectedSeat?.seatNumber === st.seatNumber &&
                          selectedSectionId === sec.id;

                        // Visual fill and stroke resolution
                        let fillColor = tierInfo.color;
                        let strokeColor = tierInfo.border;
                        let opacity = 1;

                        if (st.isBlocked) {
                          fillColor = '#cbd5e1';
                          strokeColor = '#94a3b8';
                          opacity = 0.6;
                        } else if (previewMode) {
                          if (isSelectedInPreview) {
                            fillColor = '#2563eb';
                            strokeColor = '#1d4ed8';
                          } else {
                            fillColor = '#ffffff';
                            strokeColor = tierInfo.border;
                          }
                        } else if (isSelectedInDesigner) {
                          fillColor = '#f59e0b';
                          strokeColor = '#d97706';
                        }

                        return (
                          <g
                            key={`${st.rowLabel}-${st.seatNumber}`}
                            transform={`translate(${st.coordX}, ${st.coordY}) rotate(${st.rotation || 0})`}
                            style={{ cursor: st.isBlocked ? 'not-allowed' : 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (previewMode) {
                                handlePreviewSeatClick(sec, st);
                              } else {
                                setSelectedSectionId(sec.id);
                                setSelectedSeat({ ...st, sectionId: sec.id });
                                setSelectedElementId(null);
                              }
                            }}
                            onMouseDown={(e) => {
                              if (!previewMode && e.button === 0) {
                                e.stopPropagation();
                                setSelectedSectionId(sec.id);
                                setSelectedSeat({ ...st, sectionId: sec.id });
                                setSelectedElementId(null);
                                setIsDraggingElement(true);
                                setDragItem({
                                  type: 'SEAT',
                                  id: `${sec.id}::${st.rowLabel}::${st.seatNumber}`,
                                  startClientX: e.clientX,
                                  startClientY: e.clientY,
                                  initialPosX: st.coordX,
                                  initialPosY: st.coordY,
                                });
                              }
                            }}
                          >
                            {/* Seat Shape */}
                            <circle
                              r={isSelectedInPreview || isSelectedInDesigner ? 11 : 9.5}
                              fill={fillColor}
                              stroke={strokeColor}
                              strokeWidth={isSelectedInPreview || isSelectedInDesigner ? 2.5 : 1.5}
                              opacity={opacity}
                              filter={
                                isSelectedInPreview || isSelectedInDesigner
                                  ? 'drop-shadow(0 0 6px rgba(37, 99, 235, 0.5))'
                                  : 'none'
                              }
                            />

                            {/* Accessible Wheelchair glyph */}
                            {st.isAccessible && (
                              <text
                                y="3"
                                textAnchor="middle"
                                fill={previewMode && isSelectedInPreview ? '#ffffff' : '#047857'}
                                fontSize="9"
                                fontWeight="800"
                              >
                                ♿
                              </text>
                            )}

                            {/* Blocked indicator */}
                            {st.isBlocked && !st.isAccessible && (
                              <line x1="-5" y1="-5" x2="5" y2="5" stroke="#64748b" strokeWidth="1.5" />
                            )}
                          </g>
                        );
                      })}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating Navigation & Centering Control Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(8px)',
              padding: '4px 8px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <button
              onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.15).toFixed(2)))}
              title="Zoom Out (Mouse Wheel Down also pans vertically)"
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, minWidth: '38px', textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
              title="Zoom In (Ctrl + Wheel zooms in/out)"
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              <ZoomIn size={14} />
            </button>
            <div style={{ width: '1px', height: '14px', backgroundColor: '#334155', margin: '0 2px' }} />
            <button
              onClick={handleCenterView}
              title="Recenter Architecture (Keeps design middle-aligned)"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              <Compass size={14} />
              <span>Center View</span>
            </button>
          </div>

          {/* Customer Preview Simulated Floating Booking Card */}
          {previewMode && (
            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                width: '320px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                padding: '1.25rem',
                zIndex: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Customer Seat Picker</span>
                <Badge variant="success">Interactive Mode</Badge>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                Click seats directly on the canvas to simulate guest ticket selection.
              </div>

              {previewCart.length === 0 ? (
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                  No seats selected yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {previewCart.map((item) => (
                    <div
                      key={item.seatKey}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        padding: '0.35rem 0.5rem',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Row {item.rowLabel}, Seat {item.seatNumber}</span>
                      <span style={{ fontWeight: 700, color: '#2563eb' }}>₹{item.price.toLocaleString()}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '0.5rem',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span>Total ({previewCart.length} seats)</span>
                    <span>₹{previewCartTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                style={{ width: '100%' }}
                disabled={previewCart.length === 0}
                onClick={() => alert(`Verified Customer Checkout Preview: Successfully reserved ${previewCart.length} seat(s) for ₹${previewCartTotal.toLocaleString()}`)}
              >
                Simulate 10-Min Ephemeral Hold
              </Button>
            </div>
          )}

          {/* Visual Legend (Floating centered at bottom) */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(6px)',
              padding: '0.45rem 0.85rem',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              gap: '1rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
              <span>Available</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <span>Selected / In-Review</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#047857' }} />
              <span>Accessible ♿</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
              <span>Blocked / Sightline</span>
            </div>
          </div>
        </main>

        {/* ----------------------------------------------------
            RIGHT INSPECTOR (Property Editor & Validation)
        ---------------------------------------------------- */}
        {!previewMode && (
          isRightCollapsed ? (
            <div
              onClick={() => setIsRightCollapsed(false)}
              style={{
                width: '32px',
                backgroundColor: '#f8fafc',
                borderLeft: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '0.75rem',
                zIndex: 10,
                cursor: 'pointer',
              }}
              title="Expand Inspector Panel"
            >
              <Sliders size={16} color="#64748b" />
              <span
                style={{
                  writingMode: 'vertical-rl',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#64748b',
                  marginTop: '1rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Inspector
              </span>
            </div>
          ) : (
            <>
              {/* Draggable Divider for Right Inspector */}
              <div
                onMouseDown={() => setIsResizingRight(true)}
                style={{
                  width: '6px',
                  cursor: 'col-resize',
                  backgroundColor: isResizingRight ? '#2563eb' : 'transparent',
                  transition: 'background-color 0.15s',
                  zIndex: 20,
                  userSelect: 'none',
                }}
                title="Drag to resize inspector"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#93c5fd')}
                onMouseLeave={(e) => !isResizingRight && (e.currentTarget.style.backgroundColor = 'transparent')}
              />
              <aside
                style={{
                  width: `${rightPanelWidth}px`,
                  backgroundColor: '#ffffff',
                  borderLeft: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  flexShrink: 0,
                  overflowY: 'auto',
                  zIndex: 10,
                  position: 'relative',
                }}
              >
                {/* Header with collapse button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.75rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                  <button
                    onClick={() => setIsRightCollapsed(true)}
                    title="Collapse Inspector"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', padding: '2px 4px' }}
                  >
                    ▶
                  </button>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Properties & Validation
                  </span>
                </div>
            {/* INSPECTOR CASE 1: Individual Seat Selected */}
            {selectedSeat && activeSection && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Seat Inspector
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                      Row {selectedSeat.rowLabel}, Seat {selectedSeat.seatNumber}
                    </h3>
                  </div>
                  <Badge variant={selectedSeat.isBlocked ? 'danger' : 'success'}>
                    {selectedSeat.isBlocked ? 'Blocked' : 'Available'}
                  </Badge>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                    Parent Section
                  </label>
                  <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                    {activeSection.name} ({activeSection.sectionCode})
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                    Seat Price Override (₹)
                  </label>
                  <input
                    type="number"
                    value={selectedSeat.overridePrice ?? activeSection.basePrice}
                    onChange={(e) => handleSeatPriceOverride(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Section base price: ₹{activeSection.basePrice}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                  <Button
                    size="sm"
                    variant={selectedSeat.isAccessible ? 'primary' : 'secondary'}
                    onClick={handleToggleSeatAccessible}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    ♿ {selectedSeat.isAccessible ? 'Designated Accessible Seat' : 'Mark as Accessible Seat'}
                  </Button>

                  <Button
                    size="sm"
                    variant={selectedSeat.isBlocked ? 'primary' : 'secondary'}
                    onClick={handleToggleSeatBlocked}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    🚫 {selectedSeat.isBlocked ? 'Unblock Seat for Sale' : 'Block Seat (Sightline / Console)'}
                  </Button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleAddSeatToSection}
                      style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
                      title="Append seat to this row"
                    >
                      <Plus size={13} style={{ marginRight: '4px' }} /> Add Seat
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleRemoveSeat}
                      style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      title="Delete this seat permanently (Delete key)"
                    >
                      <Trash2 size={13} style={{ marginRight: '4px' }} /> Delete Seat
                    </Button>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <strong>Coordinates:</strong> X: {selectedSeat.coordX}, Y: {selectedSeat.coordY}
                </div>
              </div>
            )}

            {/* INSPECTOR CASE 2: Section Selected */}
            {!selectedSeat && activeSection && !activeElement && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Section Inspector
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{activeSection.name}</h3>
                  </div>
                  <Badge variant="info">{activeSection.shapeType}</Badge>
                </div>

                {/* Direct Manipulation Actions Bar */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <Button
                    size="sm"
                    variant={activeSection.locked ? 'primary' : 'secondary'}
                    onClick={() => handleToggleLockSection(activeSection.id)}
                    title={activeSection.locked ? 'Unlock section' : 'Lock section in place'}
                  >
                    {activeSection.locked ? <Lock size={13} style={{ marginRight: '4px' }} /> : <Unlock size={13} style={{ marginRight: '4px' }} />}
                    {activeSection.locked ? 'Locked' : 'Lock'}
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRotateSection(activeSection.id, 45)}
                    title="Rotate section +45°"
                  >
                    <RotateCw size={13} style={{ marginRight: '4px' }} />
                    45°
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDuplicateSection(activeSection)}
                    title="Duplicate section"
                  >
                    <Copy size={13} style={{ marginRight: '4px' }} />
                    Duplicate
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleBringSectionToFront(activeSection.id)}
                    title="Bring to front (Z-Index)"
                  >
                    <ArrowUp size={13} style={{ marginRight: '4px' }} />
                    Front
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSendSectionToBack(activeSection.id)}
                    title="Send to back (Z-Index)"
                  >
                    <ArrowDown size={13} style={{ marginRight: '4px' }} />
                    Back
                  </Button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                    Section Name
                  </label>
                  <input
                    type="text"
                    value={activeSection.name}
                    onChange={(e) => updateActiveSection((s) => ({ ...s, name: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                    Unique Section Code
                  </label>
                  <input
                    type="text"
                    value={activeSection.sectionCode}
                    onChange={(e) => updateActiveSection((s) => ({ ...s, sectionCode: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                      Pricing Category
                    </label>
                    <select
                      value={activeSection.pricingTier}
                      onChange={(e) => updateActiveSection((s) => ({ ...s, pricingTier: e.target.value as any }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                    >
                      <option value="VIP">VIP</option>
                      <option value="PLATINUM">Platinum</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="STANDARD">Standard</option>
                      <option value="BALCONY">Balcony</option>
                      <option value="ACCESSIBLE">Accessible</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                      Base Price (₹)
                    </label>
                    <input
                      type="number"
                      step="50"
                      min="0"
                      value={activeSection.basePrice}
                      onChange={(e) => updateActiveSection((s) => ({ ...s, basePrice: parseFloat(e.target.value) || 0 }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>
                </div>

                {/* Geometry Controls */}
                {!activeSection.isGeneralAdmission && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>Layout Parameters</span>

                    {activeSection.shapeType === 'BANQUET_TABLES' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Table Count</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={activeSection.tableCount || 4}
                            onChange={(e) => updateActiveSection((s) => ({ ...s, tableCount: parseInt(e.target.value) || 1 }))}
                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Seats per Table</label>
                          <select
                            value={activeSection.seatsPerTable || 8}
                            onChange={(e) => updateActiveSection((s) => ({ ...s, seatsPerTable: parseInt(e.target.value) || 8 }))}
                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          >
                            <option value="4">4 Chairs</option>
                            <option value="6">6 Chairs</option>
                            <option value="8">8 Chairs</option>
                            <option value="10">10 Chairs</option>
                            <option value="12">12 Chairs</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Row Count</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={activeSection.rows}
                            onChange={(e) => updateActiveSection((s) => ({ ...s, rows: parseInt(e.target.value) || 1 }))}
                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Seats per Row</label>
                          <input
                            type="number"
                            min="1"
                            max="40"
                            value={activeSection.seatsPerRow}
                            onChange={(e) => updateActiveSection((s) => ({ ...s, seatsPerRow: parseInt(e.target.value) || 1 }))}
                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Status:</span>
                      {activeSection.seats.length === 0 ? (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          Draft (0 Seats)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                          {activeSection.seats.length} seats active
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleAddRowToSection}
                        style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
                        title="Append another row of seats to this section"
                      >
                        <Plus size={13} style={{ marginRight: '4px' }} />
                        Add Row
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleRegenerateSeats}
                        title="Regenerate all seats with current row/seat count"
                      >
                        Regen Seats
                      </Button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setClearScope('ACTIVE_SECTION');
                          setIsClearModalOpen(true);
                        }}
                        style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                        title="Clear seating layout while preserving parameters"
                      >
                        <Trash2 size={13} style={{ marginRight: '4px' }} />
                        Clear Seating
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRemoveSection(activeSection.id)}
                        disabled={sections.length <= 1}
                        style={{ color: '#991b1b', borderColor: '#f87171' }}
                        title="Delete entire section from venue"
                      >
                        <Trash2 size={13} style={{ marginRight: '4px' }} />
                        Delete Section
                      </Button>
                    </div>
                  </div>
                )}

                {/* GA Capacity control */}
                {activeSection.isGeneralAdmission && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                      Total Admission Capacity
                    </label>
                    <input
                      type="number"
                      step="25"
                      min="10"
                      value={activeSection.capacity}
                      onChange={(e) => updateActiveSection((s) => ({ ...s, capacity: parseInt(e.target.value) || 0 }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700 }}
                    />
                  </div>
                )}
                {/* Venue Location Settings */}
                <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Venue Address & Location
                  </span>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => {
                        setAddressLine1(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => {
                          setPostalCode(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INSPECTOR CASE 3: Architectural Element Selected */}
            {activeElement && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Architecture Inspector
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{activeElement.label}</h3>
                  </div>
                  <Badge variant="info">{activeElement.type}</Badge>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                    Label Text
                  </label>
                  <input
                    type="text"
                    value={activeElement.label}
                    onChange={(e) => {
                      const updated = elements.map((el) => (el.id === activeElement.id ? { ...el, label: e.target.value } : el));
                      pushState(sections, updated);
                    }}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Width</label>
                    <input
                      type="number"
                      value={activeElement.width}
                      onChange={(e) => {
                        const updated = elements.map((el) =>
                          el.id === activeElement.id ? { ...el, width: parseInt(e.target.value) || 20 } : el
                        );
                        pushState(sections, updated);
                      }}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Height</label>
                    <input
                      type="number"
                      value={activeElement.height}
                      onChange={(e) => {
                        const updated = elements.map((el) =>
                          el.id === activeElement.id ? { ...el, height: parseInt(e.target.value) || 20 } : el
                        );
                        pushState(sections, updated);
                      }}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const updated = elements.map((el) =>
                        el.id === activeElement.id ? { ...el, rotation: ((el.rotation || 0) + 45) % 360 } : el
                      );
                      pushState(sections, updated);
                    }}
                    title="Rotate element +45°"
                  >
                    <RotateCw size={13} style={{ marginRight: '4px' }} /> Rotate 45°
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDuplicateElement(activeElement)}
                    title="Duplicate element"
                  >
                    <Copy size={13} style={{ marginRight: '4px' }} /> Duplicate
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRemoveElement(activeElement.id)}
                  style={{ color: '#dc2626', borderColor: '#fca5a5', marginTop: '0.25rem' }}
                  title="Delete this element from the venue (Delete key)"
                >
                  <Trash2 size={14} style={{ marginRight: '6px' }} color="#ef4444" /> Delete Element
                </Button>
              </div>
            )}

            {/* INSPECTOR CASE 4: Nothing Selected or Empty Canvas */}
            {!selectedSeat && !activeElement && !activeSection && (
              <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: '#64748b' }}>
                <Layers size={36} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Empty Venue Canvas
                </h4>
                <p style={{ fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '1.25rem' }}>
                  No sections or structures placed yet. Add seats, stages, or gates from the left toolbox to inspect and customize them.
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleAddCustomShape('RECTANGLE')}
                  style={{ width: '100%' }}
                >
                  <Plus size={14} style={{ marginRight: '6px' }} />
                  Create First Seating Section
                </Button>
              </div>
            )}

            {/* Design Validation Warnings Section (Always pinned at bottom of inspector) */}
            <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <CheckCircle2 size={16} color={validationWarnings.length === 0 ? '#10b981' : '#f59e0b'} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  {validationWarnings.length === 0 ? 'Layout Verified' : `${validationWarnings.length} Warnings`}
                </span>
              </div>
              {validationWarnings.length === 0 ? (
                <p style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  No duplicate section codes, overlap collisions, or unpriced tiers detected.
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.7rem', color: '#b45309' }}>
                  {validationWarnings.slice(0, 3).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {validationWarnings.length > 3 && <li>...and {validationWarnings.length - 3} more</li>}
                </ul>
              )}
            </div>
          </aside>
        </>
      )
    )}
      </div>

      {/* ========================================================
          3. BOTTOM STATUS BAR
      ======================================================== */}
      <footer
        style={{
          height: '36px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#64748b',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>Pan: ({Math.round(pan.x)}, {Math.round(pan.y)})</span>
          <span>
            Selected:{' '}
            <strong style={{ color: '#0f172a' }}>
              {selectedSeat
                ? `Row ${selectedSeat.rowLabel} Seat ${selectedSeat.seatNumber}`
                : activeElement
                ? activeElement.label
                : activeSection?.name || 'Empty Canvas'}
            </strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span>
            Configured Capacity:{' '}
            <strong style={{ color: '#0f172a' }}>{totalCapacity.toLocaleString()}</strong> ({totalSeated} Seated • {totalGA} GA)
          </span>
          {totalBlocked > 0 && <span style={{ color: '#ef4444' }}>● {totalBlocked} Blocked</span>}
          <span>Version: v{layoutVersion}.0</span>
        </div>
      </footer>

      {/* Clear Seating Layout Confirmation Modal */}
      {isClearModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Clear Seating Layout
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Reset seat coordinates to a clean draft
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              This will clear all generated seat coordinates and set the layout into a zero-seat draft state. 
              Architectural markers, stages, section pricing, and geometry configurations will remain intact.
              <br /><br />
              <strong style={{ color: '#0f172a' }}>You can undo this action at any time with Ctrl+Z.</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <Button
                variant={clearScope === 'ACTIVE_SECTION' ? 'primary' : 'secondary'}
                onClick={() => setClearScope('ACTIVE_SECTION')}
                style={{ justifyContent: 'flex-start' }}
              >
                Clear Current Section ({activeSection?.name || 'Selected Section'})
              </Button>
              <Button
                variant={clearScope === 'ALL_SECTIONS' ? 'primary' : 'secondary'}
                onClick={() => setClearScope('ALL_SECTIONS')}
                style={{ justifyContent: 'flex-start', color: clearScope === 'ALL_SECTIONS' ? undefined : '#dc2626' }}
              >
                Clear All Venue Sections ({sections.length} Sections)
              </Button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setIsClearModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => handleClearSeatingLayout(clearScope)}
              >
                Confirm Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Custom Venue Layout Modal */}
      {isSaveModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '1.75rem',
              boxShadow: '0 25px 30px -5px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  <Save size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Save Custom Venue Layout
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Save this seating geometry under a custom name for event creation
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Custom Layout Name *
                </label>
                <input
                  type="text"
                  required
                  value={customLayoutName}
                  onChange={(e) => {
                    setCustomLayoutName(e.target.value);
                    setVenueName(e.target.value);
                  }}
                  placeholder="e.g. Grand Arena 360, North Amphitheatre, Symphonic Hall"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    Hosting City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Chennai, Mumbai"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 600014"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Address Line / Neighborhood
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. Club House Road, Royapettah"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Geometry Overview Pill Summary */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Capacity</span>
                  <strong style={{ color: '#0f172a', fontSize: '1rem' }}>{totalCapacity.toLocaleString()} Seats</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Zones</span>
                  <strong style={{ color: '#0f172a', fontSize: '1rem' }}>{sections.length} Sections</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Layout Type</span>
                  <strong style={{ color: '#2563eb', fontSize: '0.9rem' }}>
                    {totalGA > 0 && totalSeated > 0 ? 'HYBRID' : totalGA > 0 ? 'GA ONLY' : 'RESERVED SEATS'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setIsSaveModalOpen(false)}>
                Cancel
              </Button>
              {initialVenue?.id && (
                <Button
                  variant="secondary"
                  disabled={saving}
                  onClick={() => handleSaveVenue(false)}
                  title="Update the currently selected layout"
                >
                  {saving ? 'Updating...' : `Update Layout (v${layoutVersion + 1})`}
                </Button>
              )}
              <Button
                variant="primary"
                disabled={saving || !customLayoutName.trim()}
                onClick={() => handleSaveVenue(true)}
              >
                {saving ? 'Saving...' : initialVenue?.id ? 'Save as New Custom Layout' : 'Save Custom Layout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
