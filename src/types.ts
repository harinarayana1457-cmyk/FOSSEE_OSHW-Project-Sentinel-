/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum FacilityType {
  HOSPITAL = 'HOSPITAL',
  CLINIC = 'CLINIC',
  GOVERNMENT_BODY = 'GOVERNMENT_BODY',
}

export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface HealthRecord {
  id: string;
  patientName: string;
  symptoms: string[];
  diagnosis: string;
  location: Location;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  authorUid: string;
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  location: Location;
  contact: string;
}

export interface OutbreakAlert {
  id: string;
  disease: string;
  location: string;
  coordinates?: Location;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  timestamp: string;
}
