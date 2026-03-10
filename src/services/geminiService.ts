/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { HealthRecord, Location, OutbreakAlert } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeOutbreakRisk(records: HealthRecord[]): Promise<OutbreakAlert[]> {
  if (records.length === 0) return [];

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following health records and identify potential outbreak areas. 
      Records: ${JSON.stringify(records)}
      Return a list of potential outbreak alerts with risk levels and descriptions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              disease: { type: Type.STRING },
              location: { type: Type.STRING },
              coordinates: {
                type: Type.OBJECT,
                properties: {
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER }
                },
                required: ["lat", "lng"]
              },
              riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
              description: { type: Type.STRING },
              timestamp: { type: Type.STRING },
            },
            required: ["id", "disease", "location", "coordinates", "riskLevel", "description", "timestamp"],
          },
        },
      },
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return [];
  }
}

export interface PrecautionaryData {
  content: string;
  sources: { title: string; uri: string }[];
}

export async function getPrecautionaryMeasures(alert: OutbreakAlert): Promise<PrecautionaryData> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Provide precautionary measures, tips, and remedies for a potential ${alert.disease} outbreak in ${alert.location}. 
      Also, identify nearby hospitals and clinics that can handle such cases.
      
      Structure the response with:
      1. Immediate Remedies & Tips for Patients
      2. Precautionary Measures for the Community
      3. Recommended Healthcare Facilities`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: alert.coordinates ? {
              latitude: alert.coordinates.lat,
              longitude: alert.coordinates.lng
            } : undefined
          }
        }
      }
    });

    const sources: { title: string; uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps) {
          sources.push({
            title: chunk.maps.title || 'View on Google Maps',
            uri: chunk.maps.uri
          });
        }
      });
    }

    return {
      content: response.text || "No recommendations available.",
      sources
    };
  } catch (error) {
    console.error("Gemini measures failed:", error);
    return {
      content: "No recommendations available at this time.",
      sources: []
    };
  }
}

export interface PredictiveInsight {
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  confidence: number;
  prediction: string;
  recommendation: string;
}

export async function predictFutureOutbreaks(records: HealthRecord[]): Promise<PredictiveInsight> {
  if (records.length === 0) {
    return {
      trend: 'STABLE',
      confidence: 0,
      prediction: "Insufficient data for prediction.",
      recommendation: "Collect more health records to enable predictive analysis."
    };
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the following health records, predict potential future disease outbreak trends. 
      Consider the frequency of symptoms, severity, and geographic clustering.
      Records: ${JSON.stringify(records)}
      Return a JSON object with trend, confidence (0-1), prediction, and recommendation.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trend: { type: Type.STRING, enum: ["INCREASING", "STABLE", "DECREASING"] },
            confidence: { type: Type.NUMBER },
            prediction: { type: Type.STRING },
            recommendation: { type: Type.STRING },
          },
          required: ["trend", "confidence", "prediction", "recommendation"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini prediction failed:", error);
    return {
      trend: 'STABLE',
      confidence: 0.5,
      prediction: "Unable to generate prediction at this time.",
      recommendation: "Please try again later or contact system administrator."
    };
  }
}

export interface HomeRemedy {
  disease: string;
  remedies: string[];
  precautions: string[];
  whenToSeeDoctor: string;
}

export interface Facility {
  name: string;
  type: string;
  address: string;
  landmark: string;
  distance: string;
  mapsUrl: string;
  diseaseSpecialty: string;
}

export async function generateHomeRemedies(records: HealthRecord[]): Promise<HomeRemedy[]> {
  if (records.length === 0) return [];

  const diseases = Array.from(new Set(records.map(r => r.diagnosis))).join(", ");

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on these diagnosed diseases: ${diseases}, provide a list of safe, common home remedies and precautions.
      
      Return a JSON array of objects with exactly these fields:
      - disease: string (the name of the disease)
      - remedies: string[] (list of 3-4 simple home remedies)
      - precautions: string[] (list of 2-3 important precautions)
      - whenToSeeDoctor: string (clear warning signs)
      
      Ensure the response is ONLY the JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              disease: { type: Type.STRING },
              remedies: { type: Type.ARRAY, items: { type: Type.STRING } },
              precautions: { type: Type.ARRAY, items: { type: Type.STRING } },
              whenToSeeDoctor: { type: Type.STRING }
            },
            required: ["disease", "remedies", "precautions", "whenToSeeDoctor"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Home remedies generation failed:", error);
    return [];
  }
}

export async function searchNearbyFacilities(records: HealthRecord[], location: Location): Promise<Facility[]> {
  if (records.length === 0) return [];

  const diseases = Array.from(new Set(records.map(r => r.diagnosis))).join(", ");

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find nearby hospitals and clinics specializing in or capable of treating: ${diseases}. 
      Current location: lat ${location.lat}, lng ${location.lng}.
      
      CRITICAL: Only return facilities that are within the SAME STATE as the provided coordinates.
      
      Return the data as a JSON array of objects with exactly these fields:
      - name: string
      - type: string (Hospital/Clinic)
      - address: string
      - landmark: string (nearby well-known landmark for easy navigation)
      - distance: string (e.g., "5.2 km")
      - diseaseSpecialty: string (why this facility is relevant to the diseases listed)
      
      Ensure the response is ONLY the JSON array.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: location.lat,
              longitude: location.lng
            }
          }
        }
      }
    });

    // Extract JSON from response text (handling potential markdown blocks)
    const text = response.text || "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const facilities: Facility[] = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    
    // Enrich with maps URLs from grounding if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      facilities.forEach((facility, index) => {
        const match = chunks.find((c: any) => c.maps && c.maps.title?.includes(facility.name));
        if (match) {
          facility.mapsUrl = match.maps.uri;
        } else if (!facility.mapsUrl) {
          facility.mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(facility.name + " " + facility.address)}`;
        }
      });
    }

    return facilities;
  } catch (error) {
    console.error("Facility search failed:", error);
    return [];
  }
}
