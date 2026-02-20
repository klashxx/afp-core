"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  Droplets,
  FileDown,
  FileSpreadsheet,
  FlaskConical,
  Leaf,
  Sparkles,
  TriangleAlert,
  Upload
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { STORAGE_KEYS, THEME_VARIANTS, type ThemeVariant } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  hasBlockingErrors,
  tomatoGreenhouseExample,
  type ValidationIssue,
  type ValidatedStudy,
  type WaterFootprintResult,
  validateAndNormalizeStudy
} from "@/lib/water-footprint";

type ApiCalculationSuccess = {
  ok: true;
  result: WaterFootprintResult;
  study: ValidatedStudy;
  issues: ValidationIssue[];
};

type ApiCalculationFailure = {
  ok: false;
  issues: ValidationIssue[];
};

type CsvValidationPayload = {
  ok: boolean;
  preview: ValidatedStudy | null;
  issues: ValidationIssue[];
};

const steps = [
  { id: 1, title: "Estudio", subtitle: "Contexto y persistencia" },
  { id: 2, title: "Entradas", subtitle: "Azul, verde y gris" },
  { id: 3, title: "Revision", subtitle: "Valida y calcula" },
  { id: 4, title: "Resultados", subtitle: "Visualiza y exporta" }
] as const;

const defaultStudy: ValidatedStudy = {
  production_total_kg: 0,
  blue_m3: 0,
  green_m3: 0,
  grey: {
    enabled: false,
    pollutant: "",
    load_kg: 0,
    cmax_mg_l: 0,
    cnat_mg_l: 0
  }
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0
  }).format(value);
}

function saveBlob(content: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function WizardApp() {
  const [study, setStudy, studyLoaded] = useLocalStorage<ValidatedStudy>(STORAGE_KEYS.study, defaultStudy);
  const [variant, setVariant, variantLoaded] = useLocalStorage<ThemeVariant>(
    STORAGE_KEYS.variant,
    THEME_VARIANTS.agro
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [result, setResult] = useState<WaterFootprintResult | null>(null);
  const [calculatedStudy, setCalculatedStudy] = useState<ValidatedStudy | null>(null);
  const [csvPreview, setCsvPreview] = useState<ValidatedStudy | null>(null);
  const [csvIssues, setCsvIssues] = useState<ValidationIssue[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!variantLoaded) {
      return;
    }
    document.documentElement.dataset.variant = variant;
  }, [variant, variantLoaded]);

  useEffect(() => {
    if (!calculatedStudy) {
      return;
    }

    if (JSON.stringify(calculatedStudy) !== JSON.stringify(study)) {
      setResult(null);
    }
  }, [study, calculatedStudy]);

  const warnings = useMemo(() => issues.filter((issue) => issue.severity === "warning"), [issues]);
  const errors = useMemo(() => issues.filter((issue) => issue.severity === "error"), [issues]);

  const chartData = useMemo(() => {
    if (!result) {
      return [];
    }

    return [
      { name: "Azul", value: result.blue_l_per_kg, color: "hsl(var(--chart-1))" },
      { name: "Verde", value: result.green_l_per_kg, color: "hsl(var(--chart-2))" },
      { name: "Gris", value: result.grey_l_per_kg, color: "hsl(var(--chart-4))" }
    ];
  }, [result]);

  const handleNumericChange = (path: string, value: string) => {
    const next = Number(value);
    const normalized = Number.isFinite(next) ? next : 0;

    setStudy((previous) => {
      if (path === "production_total_kg") {
        return { ...previous, production_total_kg: normalized };
      }
      if (path === "blue_m3") {
        return { ...previous, blue_m3: normalized };
      }
      if (path === "green_m3") {
        return { ...previous, green_m3: normalized };
      }
      if (path === "grey.load_kg") {
        return { ...previous, grey: { ...previous.grey, load_kg: normalized } };
      }
      if (path === "grey.cmax_mg_l") {
        return { ...previous, grey: { ...previous.grey, cmax_mg_l: normalized } };
      }
      return { ...previous, grey: { ...previous.grey, cnat_mg_l: normalized } };
    });
  };

  const canGoBack = currentStep > 0;
  const canGoNext = currentStep < steps.length - 1;

  async function runCalculation() {
    setBusy("calculate");

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ study })
      });

      const payload = (await response.json()) as ApiCalculationSuccess | ApiCalculationFailure;
      setIssues(payload.issues ?? []);

      if (response.ok && payload.ok) {
        setResult(payload.result);
        setCalculatedStudy(payload.study);
        setCurrentStep(3);
      } else {
        setResult(null);
        setCalculatedStudy(null);
      }
    } finally {
      setBusy(null);
    }
  }

  async function downloadCsvTemplate() {
    setBusy("template");

    try {
      const response = await fetch("/api/csv/template");
      const text = await response.text();
      saveBlob(text, "afp-template.csv", "text/csv;charset=utf-8");
    } finally {
      setBusy(null);
    }
  }

  async function handleCsvUpload(file: File | null) {
    if (!file) {
      return;
    }

    setBusy("csv");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/csv/validate", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as CsvValidationPayload;
      setCsvPreview(payload.preview);
      setCsvIssues(payload.issues ?? []);

      if (response.ok && payload.preview) {
        setCurrentStep(2);
      }
    } finally {
      setBusy(null);
    }
  }

  async function exportResults(type: "pdf" | "csv") {
    if (!result) {
      return;
    }

    setBusy(type);

    try {
      const response = await fetch(`/api/export/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study: calculatedStudy ?? study,
          result
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiCalculationFailure;
        setIssues(payload.issues ?? []);
        return;
      }

      const blob = await response.blob();
      const fileName = type === "pdf" ? "afp-results.pdf" : "afp-results.csv";
      saveBlob(blob, fileName, blob.type);
    } finally {
      setBusy(null);
    }
  }

  function exportStudyJson() {
    saveBlob(
      JSON.stringify(
        {
          version: 1,
          exported_at: new Date().toISOString(),
          study
        },
        null,
        2
      ),
      "afp-study.json",
      "application/json"
    );
  }

  async function importStudyJson(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const candidate = parsed?.study ?? parsed;
      const validation = validateAndNormalizeStudy(candidate);

      setIssues(validation.issues);

      if (validation.data && !hasBlockingErrors(validation.issues)) {
        setStudy(validation.data);
        setCurrentStep(2);
      }
    } catch {
      setIssues([
        {
          field: "json",
          message: "No se pudo importar el JSON del estudio.",
          severity: "error"
        }
      ]);
    }
  }

  if (!studyLoaded || !variantLoaded) {
    return <div className="mx-auto min-h-screen max-w-6xl px-4 py-8" />;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 md:py-10">
      <header className="animate-fade-up surface border-none bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit" variant="secondary">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              P0 MVP - Retos 2026
            </Badge>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">AquaFootprint Copilot</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Wizard visual para calcular huella hidrica azul, verde y gris en L/kg con exportacion PDF/CSV y
              validacion CSV en servidor.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start rounded-full border bg-card/70 px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">Agro-Premium</span>
            <Switch
              checked={variant === THEME_VARIANTS.copilot}
              onCheckedChange={(checked) => setVariant(checked ? THEME_VARIANTS.copilot : THEME_VARIANTS.agro)}
              aria-label="Cambiar variante"
            />
            <span className="text-xs font-medium text-muted-foreground">Copilot-Sleek</span>
          </div>
        </div>
      </header>

      <Card className="animate-fade-up" style={{ animationDelay: "40ms" }}>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Paso {steps[currentStep].id}</CardTitle>
              <CardDescription>{steps[currentStep].subtitle}</CardDescription>
            </div>
            <Badge variant="outline">{steps[currentStep].title}</Badge>
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} />
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 md:grid-cols-4">
            {steps.map((step, index) => {
              const active = index === currentStep;
              const complete = index < currentStep;

              return (
                <li
                  key={step.id}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-xs transition",
                    active && "border-primary bg-primary/10",
                    complete && "border-primary/40 bg-primary/5",
                    !active && !complete && "bg-muted/30"
                  )}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {complete ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <span>{step.id}.</span>}
                    <span className="font-semibold">{step.title}</span>
                  </div>
                  <p className="text-muted-foreground">{step.subtitle}</p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Entrada de datos</CardTitle>
            <CardDescription>
              Persistencia local en navegador. Sin base de datos ni almacenamiento server-side.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 0 && (
              <div className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="production_total_kg">Produccion total (kg)</Label>
                  <Input
                    id="production_total_kg"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    type="number"
                    value={study.production_total_kg}
                    onChange={(event) => handleNumericChange("production_total_kg", event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setStudy(tomatoGreenhouseExample)}>
                    <Leaf className="h-4 w-4" />
                    Load example: Tomate invernadero
                  </Button>
                  <Button type="button" variant="outline" onClick={exportStudyJson}>
                    <Download className="h-4 w-4" />
                    Exportar estudio JSON
                  </Button>
                  <Button type="button" variant="outline" onClick={() => jsonInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    Importar JSON
                  </Button>
                  <input
                    ref={jsonInputRef}
                    className="hidden"
                    type="file"
                    accept="application/json"
                    onChange={(event) => {
                      void importStudyJson(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="blue_m3">Agua azul (m3)</Label>
                    <Input
                      id="blue_m3"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      type="number"
                      value={study.blue_m3}
                      onChange={(event) => handleNumericChange("blue_m3", event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="green_m3">Agua verde (m3)</Label>
                    <Input
                      id="green_m3"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      type="number"
                      value={study.green_m3}
                      onChange={(event) => handleNumericChange("green_m3", event.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/30 p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">Componente gris</h3>
                      <p className="text-xs text-muted-foreground">
                        Campos requeridos si habilitas contaminante y carga.
                      </p>
                    </div>
                    <Switch
                      checked={study.grey.enabled}
                      onCheckedChange={(enabled) =>
                        setStudy((previous) => ({
                          ...previous,
                          grey: { ...previous.grey, enabled }
                        }))
                      }
                      aria-label="Habilitar componente gris"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="grey_pollutant">Contaminante</Label>
                      <Input
                        id="grey_pollutant"
                        value={study.grey.pollutant}
                        onChange={(event) =>
                          setStudy((previous) => ({
                            ...previous,
                            grey: { ...previous.grey, pollutant: event.target.value }
                          }))
                        }
                        placeholder="Ej. Nitratos"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="grey_load_kg">Carga (kg)</Label>
                      <Input
                        id="grey_load_kg"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={study.grey.load_kg}
                        onChange={(event) => handleNumericChange("grey.load_kg", event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="grey_cmax">Cmax (mg/L)</Label>
                      <Input
                        id="grey_cmax"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={study.grey.cmax_mg_l}
                        onChange={(event) => handleNumericChange("grey.cmax_mg_l", event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="grey_cnat">Cnat (mg/L, default 0)</Label>
                      <Input
                        id="grey_cnat"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={study.grey.cnat_mg_l}
                        onChange={(event) => handleNumericChange("grey.cnat_mg_l", event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-primary" /> Produccion: {formatNumber(study.production_total_kg)} kg
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-chart-1" /> Azul: {formatNumber(study.blue_m3)} m3
                  </div>
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-chart-2" /> Verde: {formatNumber(study.green_m3)} m3
                  </div>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-chart-4" /> Gris: {study.grey.enabled ? "Activa" : "No activa"}
                  </div>
                </div>

                <Button type="button" size="lg" disabled={busy === "calculate"} onClick={() => void runCalculation()}>
                  {busy === "calculate" ? "Calculando..." : "Calcular huella (L/kg)"}
                </Button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                {!result && (
                  <Alert className="border-destructive/30 bg-destructive/10">
                    <AlertTitle>No hay calculo aun</AlertTitle>
                    <AlertDescription>Ejecuta el calculo en el paso anterior para ver resultados.</AlertDescription>
                  </Alert>
                )}

                {result && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground">WF Azul</p>
                        <p className="text-2xl font-semibold">{formatNumber(result.blue_l_per_kg)} L/kg</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground">WF Verde</p>
                        <p className="text-2xl font-semibold">{formatNumber(result.green_l_per_kg)} L/kg</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground">WF Gris</p>
                        <p className="text-2xl font-semibold">{formatNumber(result.grey_l_per_kg)} L/kg</p>
                      </Card>
                      <Card className="p-4 border-primary/40 bg-primary/10">
                        <p className="text-xs text-muted-foreground">WF Total</p>
                        <p className="text-2xl font-semibold">{formatNumber(result.total_l_per_kg)} L/kg</p>
                      </Card>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void exportResults("pdf")} disabled={busy === "pdf"}>
                        <FileDown className="h-4 w-4" />
                        {busy === "pdf" ? "Generando PDF..." : "Exportar PDF"}
                      </Button>
                      <Button variant="secondary" onClick={() => void exportResults("csv")} disabled={busy === "csv"}>
                        <FileSpreadsheet className="h-4 w-4" />
                        {busy === "csv" ? "Generando CSV..." : "Exportar CSV"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="ghost" disabled={!canGoBack} onClick={() => canGoBack && setCurrentStep((step) => step - 1)}>
                Atras
              </Button>
              <Button variant="outline" disabled={!canGoNext} onClick={() => canGoNext && setCurrentStep((step) => step + 1)}>
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">CSV Import</CardTitle>
              <CardDescription>Template &rarr; subida &rarr; validacion server-side &rarr; preview &rarr; apply</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={() => void downloadCsvTemplate()} disabled={busy === "template"}>
                <Download className="h-4 w-4" />
                {busy === "template" ? "Preparando..." : "Descargar template CSV"}
              </Button>

              <Label htmlFor="csv-upload" className="block text-xs text-muted-foreground">
                Subir CSV
              </Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  void handleCsvUpload(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />

              {csvPreview && (
                <div className="rounded-2xl border bg-muted/20 p-3 text-xs">
                  <p>
                    Preview: {formatNumber(csvPreview.production_total_kg)} kg - azul {formatNumber(csvPreview.blue_m3)} m3 -
                    verde {formatNumber(csvPreview.green_m3)} m3
                  </p>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => {
                      setStudy(csvPreview);
                      setCurrentStep(2);
                    }}
                  >
                    Apply preview
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Mensajes de validacion</CardTitle>
              <CardDescription>Errores bloqueantes y advertencias de calculo/importacion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {errors.length === 0 && warnings.length === 0 && csvIssues.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin incidencias pendientes.</p>
              )}

              {[...issues, ...csvIssues].map((issue, index) => (
                <Alert
                  key={`${issue.field}-${issue.message}-${index}`}
                  className={cn(
                    "py-3",
                    issue.severity === "error" && "border-destructive/40 bg-destructive/10",
                    issue.severity === "warning" && "border-secondary/50 bg-secondary/15"
                  )}
                >
                  <AlertTitle className="flex items-center gap-2 text-sm">
                    <TriangleAlert className="h-4 w-4" />
                    {issue.severity === "error" ? "Error" : "Advertencia"} - {issue.field}
                  </AlertTitle>
                  <AlertDescription>{issue.message}</AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {result && (
        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Distribucion por componente</CardTitle>
              <CardDescription>Composicion de la huella hidrica total en L/kg.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  azul: { label: "Azul", color: "hsl(var(--chart-1))" },
                  verde: { label: "Verde", color: "hsl(var(--chart-2))" },
                  gris: { label: "Gris", color: "hsl(var(--chart-4))" }
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${formatNumber(value)} L/kg`} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Comparativa L/kg</CardTitle>
              <CardDescription>Vista rapida para azul, verde, gris y total.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  wf: { label: "WF", color: "hsl(var(--chart-1))" }
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Azul", value: result.blue_l_per_kg },
                      { name: "Verde", value: result.green_l_per_kg },
                      { name: "Gris", value: result.grey_l_per_kg },
                      { name: "Total", value: result.total_l_per_kg }
                    ]}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${formatNumber(value)} L/kg`} />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
