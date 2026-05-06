"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboardingStore } from "@/lib/stores/onboarding.store";
import { cn } from "@/lib/utils/cn";

const schema = z.object({
  email:           z.string().email("Enter a valid email"),
  phone:           z.string().optional(),
  locationCity:    z.string().min(1, "City is required"),
  locationCountry: z.string().min(1, "Country is required"),
  locationText:    z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ContactPage() {
  const router = useRouter();
  const { draft, updateDraft, markStepComplete, saveDraft } = useOnboardingStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email:           draft.email           ?? "",
      phone:           draft.phone           ?? "",
      locationCity:    draft.locationCity    ?? "",
      locationCountry: draft.locationCountry ?? "",
      locationText:    draft.locationText    ?? "",
    },
  });

  const city    = watch("locationCity");
  const country = watch("locationCountry");

  const onSubmit = async (data: FormValues) => {
    const locationText = [data.locationCity, data.locationCountry].filter(Boolean).join(", ");
    updateDraft({ ...data, locationText });
    markStepComplete("contact");
    await saveDraft();
    router.push("/onboarding/cv-upload");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-2xl px-6 py-10"
    >
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 2 of 9</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-foreground">Contact Information</h1>
        <p className="mt-2 text-sm text-muted-foreground">How can recruiters reach you? Email and location are required.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="sara@example.com"
            autoComplete="email"
            autoFocus
            {...register("email")}
            className={cn("h-11", errors.email && "border-destructive")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          <p className="text-[11px] text-muted-foreground/60">Only shared with recruiters after you consent to de-anonymization.</p>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm font-medium">
            Phone <span className="text-muted-foreground/60">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+20 100 000 0000"
            autoComplete="tel"
            {...register("phone")}
            className="h-11"
          />
        </div>

        {/* City + Country */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="locationCity" className="text-sm font-medium">City</Label>
            <Input
              id="locationCity"
              placeholder="Cairo"
              {...register("locationCity")}
              className={cn("h-11", errors.locationCity && "border-destructive")}
            />
            {errors.locationCity && <p className="text-xs text-destructive">{errors.locationCity.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locationCountry" className="text-sm font-medium">Country</Label>
            <Input
              id="locationCountry"
              placeholder="Egypt"
              {...register("locationCountry")}
              className={cn("h-11", errors.locationCountry && "border-destructive")}
            />
            {errors.locationCountry && <p className="text-xs text-destructive">{errors.locationCountry.message}</p>}
          </div>
        </div>

        {(city || country) && (
          <p className="text-[12px] text-muted-foreground">
            Your location will appear as: <span className="font-medium text-foreground">{[city, country].filter(Boolean).join(", ")}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" className="gap-2" onClick={() => router.push("/onboarding/basic-info")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button type="submit" className="gap-2 glow-blue" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <>Save &amp; Continue <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
