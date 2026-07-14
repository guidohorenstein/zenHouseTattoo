import { useMemo, useState } from "react";
import { FormNavigation } from "./components/FormNavigation";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { ProgressBar } from "./components/ProgressBar";
import {
  generalZones,
  getBodyReferenceImageUrl,
  getGeneralZoneImageUrl,
  getSpecificZoneImageUrl,
  getSpecificZones,
  getZoneImageUrl,
} from "./data/bodyZones";
import {
  colorModes,
  contactTimeOptions,
  formSteps,
  tattooStyles,
  timingOptions,
} from "./data/formSteps";
import { languageOptions, translations } from "./data/translations";
import { OptionsStep } from "./steps/OptionsStep";
import { PlacementStep } from "./steps/PlacementStep";
import { IdeaStep } from "./steps/IdeaStep";
import { TextInputStep } from "./steps/TextInputStep";
import { buildWhatsappUrl } from "./utils/buildWhatsappMessage";

const initialFormData = {
  fullName: "",
  bodyReference: "",
  hasTattoos: "",
  generalZone: "",
  specificZone: "",
  placementBoxes: [],
  styles: [],
  colorMode: "",
  ideaDescription: "",
  referenceImages: [],
  timing: "",
  contactTimes: [],
  phone: "",
};

function isStepValid(stepId, formData) {
  const length = (value) => value.trim().length;

  const validations = {
    name: length(formData.fullName) >= 3,
    bodyReference: Boolean(formData.bodyReference),
    hasTattoos: Boolean(formData.hasTattoos),
    generalZone: Boolean(formData.generalZone),
    specificZone: Boolean(formData.specificZone),
    placement: formData.placementBoxes.length > 0,
    style: formData.styles.length > 0,
    color: Boolean(formData.colorMode),
    description: length(formData.ideaDescription) >= 10,
    timing: Boolean(formData.timing),
    contactTime: formData.contactTimes.length > 0,
    phone: length(formData.phone) >= 8,
  };

  return validations[stepId] || false;
}

function toOptions(ids, t, getImageUrl) {
  return ids.map((id) => ({
    id,
    label: t.options[id],
    imageUrl: getImageUrl?.(id),
  }));
}

export function TattooFormPage() {
  const [language, setLanguage] = useState("en");
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialFormData);
  const t = translations[language];
  const direction = languageOptions.find((option) => option.id === language)?.dir || "ltr";
  const stepId = formSteps[currentStep];
  const canGoNext = isStepValid(stepId, formData);
  const isLastStep = currentStep === formSteps.length - 1;

  const options = useMemo(
    () => ({
      bodyReference: toOptions(["male", "female"], t, getBodyReferenceImageUrl),
      hasTattoos: toOptions(["yes", "no"], t),
      generalZones: generalZones.map((zone) => ({
        id: zone.id,
        label: t.options[zone.id],
        imageUrl: getGeneralZoneImageUrl(zone.id, formData.bodyReference),
      })),
      specificZones: toOptions(getSpecificZones(formData.generalZone), t, (specificZoneId) =>
        getSpecificZoneImageUrl(specificZoneId, formData.bodyReference)
      ),
      styles: toOptions(tattooStyles, t),
      colors: toOptions(colorModes, t),
      timing: toOptions(timingOptions, t),
      contactTimes: toOptions(contactTimeOptions, t),
    }),
    [formData.bodyReference, formData.generalZone, t]
  );

  function updateFormData(field, value) {
    setFormData((currentData) => {
      const nextData = { ...currentData, [field]: value };

      if (field === "generalZone") {
        nextData.specificZone = "";
        nextData.placementBoxes = [];
      }

      if (field === "specificZone" || field === "bodyReference") {
        nextData.placementBoxes = [];
      }

      return nextData;
    });
  }

  function goNext() {
    if (!canGoNext || isLastStep) return;
    setCurrentStep((step) => step + 1);
  }

  function goBack() {
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  function submit() {
    if (!canGoNext) return;
    window.open(buildWhatsappUrl(formData, t), "_blank", "noopener,noreferrer");
  }

  function updatePhone(value) {
    updateFormData("phone", value.replace(/[^\d+\-()\s]/g, ""));
  }

  function renderStep() {
    const stepText = t.steps[stepId];

    const steps = {
      name: (
        <TextInputStep
          title={stepText.title}
          placeholder={stepText.placeholder}
          value={formData.fullName}
          onChange={(value) => updateFormData("fullName", value)}
        />
      ),
      bodyReference: (
        <OptionsStep
          title={stepText.title}
          note={stepText.note}
          options={options.bodyReference}
          value={formData.bodyReference}
          onChange={(value) => updateFormData("bodyReference", value)}
        />
      ),
      hasTattoos: (
        <OptionsStep
          title={stepText.title}
          options={options.hasTattoos}
          value={formData.hasTattoos}
          onChange={(value) => updateFormData("hasTattoos", value)}
        />
      ),
      generalZone: (
        <OptionsStep
          title={stepText.title}
          options={options.generalZones}
          value={formData.generalZone}
          onChange={(value) => updateFormData("generalZone", value)}
        />
      ),
      specificZone: (
        <OptionsStep
          title={stepText.title}
          options={options.specificZones}
          value={formData.specificZone}
          onChange={(value) => updateFormData("specificZone", value)}
        />
      ),
      placement: (
        <PlacementStep
          title={stepText.title}
          note={stepText.note}
          imageUrl={getZoneImageUrl(formData)}
          value={formData.placementBoxes}
          onChange={(value) => updateFormData("placementBoxes", value)}
          labels={t}
        />
      ),
      style: (
        <OptionsStep
          title={stepText.title}
          options={options.styles}
          value={formData.styles}
          onChange={(value) => updateFormData("styles", value)}
          multiple
        />
      ),
      color: (
        <OptionsStep
          title={stepText.title}
          options={options.colors}
          value={formData.colorMode}
          onChange={(value) => updateFormData("colorMode", value)}
        />
      ),
      description: (
        <IdeaStep
          title={stepText.title}
          placeholder={stepText.placeholder}
          value={formData.ideaDescription}
          onDescriptionChange={(value) => updateFormData("ideaDescription", value)}
          referenceImages={formData.referenceImages}
          onReferenceImagesChange={(value) => updateFormData("referenceImages", value)}
          labels={t}
        />
      ),
      timing: (
        <OptionsStep
          title={stepText.title}
          options={options.timing}
          value={formData.timing}
          onChange={(value) => updateFormData("timing", value)}
        />
      ),
      contactTime: (
        <OptionsStep
          title={stepText.title}
          options={options.contactTimes}
          value={formData.contactTimes}
          onChange={(value) => updateFormData("contactTimes", value)}
          multiple
        />
      ),
      phone: (
        <TextInputStep
          title={stepText.title}
          placeholder={stepText.placeholder}
          type="tel"
          inputMode="tel"
          value={formData.phone}
          onChange={updatePhone}
        />
      ),
    };

    return steps[stepId];
  }

  return (
    <main className="form-page" lang={language} dir={direction}>
      <section className="form-card" aria-label={t.intro}>
        <div className="form-top">
          <div className="brand-block">
            <div className="brand-logo-frame">
              <img
                className="brand-logo"
                src="/images/logo/zen_house_logo_04_transparente.png"
                alt="Zen House Tattoo"
              />
            </div>
            <div>
              <p className="eyebrow">{t.brand}</p>
              <p>{t.intro}</p>
            </div>
          </div>
          <LanguageSwitcher language={language} onChange={setLanguage} />
        </div>

        <ProgressBar
          currentStep={currentStep}
          totalSteps={formSteps.length}
          label={t.step}
          ofLabel={t.of}
        />

        {renderStep()}

        <FormNavigation
          backLabel={t.back}
          nextLabel={t.next}
          quoteLabel={t.quote}
          canGoBack={currentStep > 0}
          canGoNext={canGoNext}
          isLastStep={isLastStep}
          onBack={goBack}
          onNext={goNext}
          onSubmit={submit}
        />
      </section>
    </main>
  );
}
