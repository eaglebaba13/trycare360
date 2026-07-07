import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/app-shell";
import { CrudTable, type FieldSpec } from "@/components/settings/crud-table";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { listRows } from "@/lib/api/config.functions";

export const Route = createFileRoute("/_authenticated/settings/territory")({
  component: TerritoryPage,
});

function TerritoryPage() {
  const list = useServerFn(listRows);
  const [countryId, setCountryId] = useState<string>("");
  const [stateId, setStateId] = useState<string>("");
  const [districtId, setDistrictId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [areaId, setAreaId] = useState<string>("");

  const { data: countries = [] } = useQuery({
    queryKey: ["config", "countries"],
    queryFn: () => list({ data: { table: "countries", orderBy: { column: "display_order" } } }),
  });
  const { data: states = [] } = useQuery({
    queryKey: ["config", "states", countryId],
    queryFn: () =>
      list({ data: { table: "states", filters: { country_id: countryId }, orderBy: { column: "name" } } }),
    enabled: !!countryId,
  });
  const { data: districts = [] } = useQuery({
    queryKey: ["config", "districts", stateId],
    queryFn: () =>
      list({ data: { table: "districts", filters: { state_id: stateId }, orderBy: { column: "name" } } }),
    enabled: !!stateId,
  });
  const { data: cities = [] } = useQuery({
    queryKey: ["config", "cities", districtId],
    queryFn: () =>
      list({ data: { table: "cities", filters: { district_id: districtId }, orderBy: { column: "name" } } }),
    enabled: !!districtId,
  });
  const { data: areas = [] } = useQuery({
    queryKey: ["config", "areas", cityId],
    queryFn: () =>
      list({ data: { table: "areas", filters: { city_id: cityId }, orderBy: { column: "name" } } }),
    enabled: !!cityId,
  });

  const commonFields = (extra: FieldSpec[] = []): FieldSpec[] => [
    { key: "code", label: "Code", type: "text", hideInTable: false, width: "140px" },
    { key: "name", label: "Name", type: "text", required: true },
    ...extra,
    { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
    { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
  ];

  return (
    <PageContainer
      title="Territory Management"
      description="Country → State → District → City → Area → PIN Code. Used across CRM, franchise, delivery and GST invoicing."
    >
      <Card className="p-4 mb-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Picker label="Country" value={countryId} onChange={(v) => { setCountryId(v); setStateId(""); setDistrictId(""); setCityId(""); setAreaId(""); }} rows={countries} />
          <Picker label="State" value={stateId} onChange={(v) => { setStateId(v); setDistrictId(""); setCityId(""); setAreaId(""); }} rows={states} disabled={!countryId} />
          <Picker label="District" value={districtId} onChange={(v) => { setDistrictId(v); setCityId(""); setAreaId(""); }} rows={districts} disabled={!stateId} />
          <Picker label="City" value={cityId} onChange={(v) => { setCityId(v); setAreaId(""); }} rows={cities} disabled={!districtId} />
          <Picker label="Area" value={areaId} onChange={setAreaId} rows={areas} disabled={!cityId} />
        </div>
      </Card>

      <div className="space-y-4">
        <CrudTable
          table="countries"
          title="Countries"
          searchKey="name"
          fields={[
            { key: "code", label: "Code", type: "text", required: true, width: "100px" },
            { key: "name", label: "Name", type: "text", required: true },
            { key: "iso2", label: "ISO2", type: "text", width: "80px" },
            { key: "iso3", label: "ISO3", type: "text", width: "80px" },
            { key: "phone_code", label: "Phone", type: "text", width: "100px" },
            { key: "currency_code", label: "Currency", type: "text", width: "100px" },
            { key: "currency_symbol", label: "Symbol", type: "text", hideInTable: true },
            { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
            { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
          ]}
          orderBy={{ column: "display_order" }}
        />

        {countryId && (
          <CrudTable
            table="states"
            title="States"
            searchKey="name"
            fields={commonFields([
              { key: "gst_state_code", label: "GST Code", type: "text", width: "100px" },
            ])}
            filters={{ country_id: countryId }}
            contextValues={{ country_id: countryId }}
            queryKeyExtra={[countryId]}
            orderBy={{ column: "name" }}
          />
        )}

        {stateId && (
          <CrudTable
            table="districts"
            title="Districts"
            searchKey="name"
            fields={commonFields()}
            filters={{ state_id: stateId }}
            contextValues={{ state_id: stateId }}
            queryKeyExtra={[stateId]}
            orderBy={{ column: "name" }}
          />
        )}

        {districtId && (
          <CrudTable
            table="cities"
            title="Cities"
            searchKey="name"
            fields={[
              { key: "name", label: "Name", type: "text", required: true },
              { key: "is_metro", label: "Metro", type: "boolean", defaultValue: false, width: "100px" },
              { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
              { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
            ]}
            filters={{ district_id: districtId }}
            contextValues={{ district_id: districtId }}
            queryKeyExtra={[districtId]}
            orderBy={{ column: "name" }}
          />
        )}

        {cityId && (
          <CrudTable
            table="areas"
            title="Areas"
            searchKey="name"
            fields={[
              { key: "name", label: "Name", type: "text", required: true },
              { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
              { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
            ]}
            filters={{ city_id: cityId }}
            contextValues={{ city_id: cityId }}
            queryKeyExtra={[cityId]}
            orderBy={{ column: "name" }}
          />
        )}

        {cityId && (
          <CrudTable
            table="pincodes"
            title="PIN Codes"
            searchKey="code"
            fields={[
              { key: "code", label: "PIN", type: "text", required: true, width: "120px" },
              {
                key: "area_id",
                label: "Area",
                type: "select",
                options: [{ value: "", label: "— none —" }, ...(areas as Array<{ id: string; name: string }>).map((a) => ({ value: a.id, label: a.name }))],
              },
              { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
            ]}
            filters={{ city_id: cityId }}
            contextValues={{ city_id: cityId }}
            queryKeyExtra={[cityId, areas.length]}
            orderBy={{ column: "code" }}
          />
        )}
      </div>
    </PageContainer>
  );
}

function Picker({
  label,
  value,
  onChange,
  rows,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: unknown[];
  disabled?: boolean;
}) {
  const opts = rows as Array<{ id: string; name: string }>;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={disabled ? "—" : `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {opts.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
