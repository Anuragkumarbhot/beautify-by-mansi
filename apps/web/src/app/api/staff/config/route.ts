import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isManagerResponse,
  requireAppointmentManager,
} from "@/lib/staff-api";
import { supabaseRestAsUser } from "@/lib/supabase-rest";

const uuid = z.string().uuid();
const slug = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/);
const time = z.string().regex(/^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$/);

const serviceSchema = z.object({
  slug,
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  description: z.string().max(1200).default(""),
  duration_minutes: z.number().int().min(1).max(1440),
  buffer_before_minutes: z.number().int().min(0).max(1440).default(0),
  buffer_after_minutes: z.number().int().min(0).max(1440).default(0),
  price_amount: z.number().int().min(0).nullable().optional(),
  supports_studio: z.boolean(),
  supports_home: z.boolean(),
  is_active: z.boolean().default(false),
}).strict().refine((value) => value.supports_studio || value.supports_home, {
  message: "At least one appointment location must be enabled.",
});

const resourceSchema = z.object({
  resource_type: z.enum(["staff", "studio_room"]),
  display_name: z.string().trim().min(1).max(120),
  is_active: z.boolean().default(false),
}).strict();

const areaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  pincode: z.string().regex(/^\\d{6}$/),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  travel_buffer_minutes: z.number().int().min(0).max(1440),
  is_active: z.boolean().default(false),
}).strict();

const mappingSchema = z.object({
  resource_id: uuid,
  service_id: uuid,
  location_type: z.enum(["studio", "home"]),
}).strict();

const availabilitySchema = z.object({
  resource_id: uuid,
  location_type: z.enum(["studio", "home"]),
  weekday: z.number().int().min(0).max(6),
  opens_at: time,
  closes_at: time,
  slot_interval_minutes: z.number().int().min(5).max(240),
  timezone_name: z.literal("Asia/Kolkata").default("Asia/Kolkata"),
  effective_from: z.string().date().nullable().optional(),
  effective_until: z.string().date().nullable().optional(),
  is_active: z.boolean().default(false),
}).strict().refine((value) => value.opens_at < value.closes_at, {
  message: "Closing time must be later than opening time.",
}).refine((value) => !value.effective_from || !value.effective_until || value.effective_until >= value.effective_from, {
  message: "Effective end date must be on or after the start date.",
});

const blackoutSchema = z.object({
  resource_id: uuid,
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  reason: z.string().max(240).default(""),
}).strict().refine((value) => new Date(value.starts_at).getTime() < new Date(value.ends_at).getTime(), {
  message: "Blackout end must be after its start.",
});

const settingsSchema = z.object({
  timezone_name: z.literal("Asia/Kolkata").default("Asia/Kolkata"),
  minimum_notice_minutes: z.number().int().min(0).max(525600),
  booking_horizon_days: z.number().int().min(1).max(365),
}).strict();

const schemas = {
  services: serviceSchema,
  resources: resourceSchema,
  areas: areaSchema,
  mappings: mappingSchema,
  availability: availabilitySchema,
  blackouts: blackoutSchema,
  settings: settingsSchema,
};

type Collection = keyof typeof schemas;
type ConfigRequest = {
  collection: Collection;
  action: "create" | "update" | "delete";
  id?: string;
  values?: unknown;
};

const collectionTable: Record<Collection, string> = {
  services: "appointment_services",
  resources: "appointment_resources",
  areas: "appointment_service_areas",
  mappings: "appointment_resource_services",
  availability: "appointment_availability_rules",
  blackouts: "appointment_blackouts",
  settings: "appointment_booking_settings",
};

const configSelects: Record<Collection, string> = {
  services: "id,slug,name,category,description,duration_minutes,buffer_before_minutes,buffer_after_minutes,price_amount,supports_studio,supports_home,is_active,updated_at",
  resources: "id,resource_type,display_name,is_active,updated_at",
  areas: "id,name,pincode,city,state,travel_buffer_minutes,is_active,updated_at",
  mappings: "resource_id,service_id,location_type",
  availability: "id,resource_id,location_type,weekday,opens_at,closes_at,slot_interval_minutes,timezone_name,effective_from,effective_until,is_active,updated_at",
  blackouts: "id,resource_id,starts_at,ends_at,reason,created_by,created_at",
  settings: "id,timezone_name,minimum_notice_minutes,booking_horizon_days,public_booking_enabled,updated_at",
};

function filtersForMapping(values: Record<string, unknown>) {
  return "resource_id=eq." + encodeURIComponent(String(values.resource_id))
    + "&service_id=eq." + encodeURIComponent(String(values.service_id))
    + "&location_type=eq." + encodeURIComponent(String(values.location_type));
}

export async function GET(request: NextRequest) {
  const manager = await requireAppointmentManager(request);
  if (isManagerResponse(manager)) return manager;

  try {
    const data = await Promise.all((Object.keys(collectionTable) as Collection[]).map(async (collection) => {
      const order = collection === "settings" ? "" :
        collection === "mappings" ? "&order=resource_id.asc" : "&order=created_at.desc";
      const rows = await supabaseRestAsUser<unknown[]>(
        "/rest/v1/" + collectionTable[collection] + "?select=" + configSelects[collection] +
          (collection === "settings" ? "&id=eq.1" : order),
        manager.accessToken
      );
      return [collection, rows] as const;
    }));

    return NextResponse.json(
      { config: Object.fromEntries(data) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "CONFIGURATION_LOAD_FAILED" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const manager = await requireAppointmentManager(request);
  if (isManagerResponse(manager)) return manager;

  let body: ConfigRequest;
  try {
    body = await request.json() as ConfigRequest;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const requestSchema = z.object({
    collection: z.enum(["services", "resources", "areas", "mappings", "availability", "blackouts", "settings"]),
    action: z.enum(["create", "update", "delete"]),
    id: uuid.optional(),
    values: z.unknown().optional(),
  }).strict();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_CONFIGURATION_REQUEST" }, { status: 400 });
  }

  const { collection, action, id } = parsed.data;
  const values = parsed.data.values && typeof parsed.data.values === "object"
    ? parsed.data.values as Record<string, unknown>
    : {};
  const table = collectionTable[collection];

  if (action === "delete") {
    if (collection === "settings" || (collection !== "mappings" && !id)) {
      return NextResponse.json({ error: "CONFIGURATION_ID_REQUIRED" }, { status: 400 });
    }
    if (collection === "mappings") {
      const mapping = mappingSchema.safeParse(values);
      if (!mapping.success) {
        return NextResponse.json({ error: "INVALID_CONFIGURATION_VALUES", details: mapping.error.flatten() }, { status: 400 });
      }
      try {
        await supabaseRestAsUser(
          "/rest/v1/" + table + "?" + filtersForMapping(mapping.data),
          manager.accessToken,
          { method: "DELETE" }
        );
        return NextResponse.json({ success: true });
      } catch {
        return NextResponse.json({ error: "CONFIGURATION_DELETE_FAILED" }, { status: 409 });
      }
    }

    try {
      await supabaseRestAsUser(
        "/rest/v1/" + table + "?id=eq." + encodeURIComponent(id!),
        manager.accessToken,
        { method: "DELETE" }
      );
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: "CONFIGURATION_DELETE_FAILED" }, { status: 409 });
    }
  }

  const schema = schemas[collection];
  const result = schema.safeParse(values);
  if (!result.success) {
    return NextResponse.json(
      { error: "INVALID_CONFIGURATION_VALUES", details: result.error.flatten() },
      { status: 400 }
    );
  }

  if (action === "update" && collection !== "settings" && collection !== "mappings" && !id) {
    return NextResponse.json({ error: "CONFIGURATION_ID_REQUIRED" }, { status: 400 });
  }
  if (action === "update" && collection === "mappings") {
    return NextResponse.json({ error: "MAPPING_UPDATE_NOT_SUPPORTED" }, { status: 400 });
  }
  if (action === "create" && collection === "settings") {
    return NextResponse.json({ error: "SETTINGS_ROW_ALREADY_EXISTS" }, { status: 409 });
  }

  const cleanValues = result.data as Record<string, unknown>;
  if (collection === "blackouts" && action === "create") {
    cleanValues.created_by = manager.userId;
  }

  let path = "/rest/v1/" + table;
  let method: "POST" | "PATCH" = "POST";
  if (action === "update") {
    method = "PATCH";
    path += collection === "settings" ? "?id=eq.1" : "?id=eq." + encodeURIComponent(id!);
  }
  try {
    const rows = await supabaseRestAsUser<unknown[]>(
      path + (method === "PATCH" ? "&select=" + configSelects[collection] : "?select=" + configSelects[collection]),
      manager.accessToken,
      {
        method,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(cleanValues),
      }
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "CONFIGURATION_NOT_SAVED" }, { status: 409 });
    }
    return NextResponse.json({ item: rows[0] }, { status: action === "create" ? 201 : 200 });
  } catch {
    return NextResponse.json(
      { error: "CONFIGURATION_SAVE_FAILED", message: "Check for duplicate slugs, invalid relationships or active reservations before retrying." },
      { status: 409 }
    );
  }
}
