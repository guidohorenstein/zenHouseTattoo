import { useEffect, useMemo, useRef, useState } from "react";
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
  extraTattooStyles,
  formSteps,
  tattooStyles,
  timingOptions,
} from "./data/formSteps";
import { languageOptions, translations } from "./data/translations";
import { ContactStep } from "./steps/ContactStep";
import { OptionsStep } from "./steps/OptionsStep";
import { PlacementStep } from "./steps/PlacementStep";
import { IdeaStep } from "./steps/IdeaStep";
import { buildWhatsappUrl } from "./utils/buildWhatsappMessage";

const initialFormData = {
  fullName: "",
  email: "",
  phone: "",
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
};

function isStepValid(stepId, formData) {
  const length = (value) => value.trim().length;
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    formData.email.trim(),
  );
  const hasIdeaText = length(formData.ideaDescription) >= 20;

  const validations = {
    name:
      length(formData.fullName) >= 3 &&
      hasValidEmail &&
      length(formData.phone) >= 8,
    description: hasIdeaText,
    bodyReference: Boolean(formData.bodyReference),
    hasTattoos: Boolean(formData.hasTattoos),
    generalZone: Boolean(formData.generalZone),
    specificZone: Boolean(formData.specificZone),
    placement: formData.placementBoxes.length > 0,
    style: formData.styles.length > 0,
    color: Boolean(formData.colorMode),
    timing: Boolean(formData.timing),
    contactTime: formData.contactTimes.length > 0,
  };

  return validations[stepId] || false;
}

function stepError(stepId, labels) {
  return labels.errors[stepId] || labels.errors.default;
}

function toOptions(ids, t, getImageUrl) {
  return ids.map((id) => ({
    id,
    label: t.options[id],
    imageUrl: getImageUrl?.(id),
  }));
}

const styleImageAliases = {
  lettering: "fineLine",
  dotwork: "ornamental",
  microRealism: "realism",
  abstract: "surrealism",
  floral: "neoTraditional",
  mandala: "ornamental",
};

function getTattooStyleImageUrl(styleId, colorMode) {
  const imageId = styleImageAliases[styleId] || styleId;

  if (colorMode === "blackGrey") {
    return `/images/tattoo-styles/black-grey/thumbs/${imageId}.jpg`;
  }

  return `/images/tattoo-styles/thumbs/${imageId}.jpg`;
}

export function TattooFormPage() {
  const [language, setLanguage] = useState("he");
  const [currentStep, setCurrentStep] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState("next");
  const [ideaNotice, setIdeaNotice] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef(null);
  const [formData, setFormData] = useState(initialFormData);
  const t = translations[language];
  const direction =
    languageOptions.find((option) => option.id === language)?.dir || "ltr";
  const stepId = formSteps[currentStep];
  const canGoNext = isStepValid(stepId, formData);
  const isLastStep = currentStep === formSteps.length - 1;

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  function showToast(message) {
    setToastMessage(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(""), 3200);
  }

  const options = useMemo(
    () => ({
      bodyReference: toOptions(["male", "female"], t, getBodyReferenceImageUrl),
      hasTattoos: toOptions(["yes", "no"], t),
      generalZones: generalZones.map((zone) => ({
        id: zone.id,
        label: t.options[zone.id],
        imageUrl: getGeneralZoneImageUrl(zone.id, formData.bodyReference),
      })),
      specificZones: toOptions(
        getSpecificZones(formData.generalZone),
        t,
        (specificZoneId) =>
          getSpecificZoneImageUrl(specificZoneId, formData.bodyReference),
      ),
      styles: toOptions(
        formData.colorMode === "blackGrey"
          ? tattooStyles
          : tattooStyles.filter((styleId) => styleId !== "blackwork"),
        t,
        (styleId) => getTattooStyleImageUrl(styleId, formData.colorMode),
      ),
      extraStyles: toOptions(extraTattooStyles, t, (styleId) =>
        getTattooStyleImageUrl(styleId, formData.colorMode),
      ),
      colors: toOptions(
        colorModes,
        t,
        (colorModeId) => `/images/color-examples/${colorModeId}.jpeg`,
      ),
      timing: toOptions(timingOptions, t),
      contactTimes: toOptions(contactTimeOptions, t),
    }),
    [formData.bodyReference, formData.colorMode, formData.generalZone, t],
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

      if (field === "colorMode" && value !== currentData.colorMode) {
        nextData.styles = [];
      }

      return nextData;
    });

    if (field === "referenceImages" && value.length > 0) {
      setIdeaNotice("");
    }
  }

  function goNext() {
    if (!canGoNext || isLastStep) return;

    setTransitionDirection("next");
    setCurrentStep((step) => step + 1);
  }

  function goBack() {
    setTransitionDirection("back");
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  async function submit() {
    if (!canGoNext) return;

    const { submitInquiry } = await import("./services/submitInquiry");
    const result = await submitInquiry(formData, language);

    if (result.error) {
      showToast(result.error);
      return;
    }

    window.open(buildWhatsappUrl(formData, t), "_blank", "noopener,noreferrer");
  }

  function showStepError() {
    showToast(stepError(stepId, t));
  }

  function updatePhone(value) {
    updateFormData("phone", value.replace(/[^\d+\-()\s]/g, ""));
  }

  function renderStep() {
    const stepText = t.steps[stepId];

    const steps = {
      name: (
        <ContactStep
          title={stepText.title}
          fullName={formData.fullName}
          email={formData.email}
          phone={formData.phone}
          placeholders={stepText.placeholders}
          onFullNameChange={(value) => updateFormData("fullName", value)}
          onEmailChange={(value) => updateFormData("email", value)}
          onPhoneChange={updatePhone}
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
          variant="styles"
          moreLabel={t.moreStyles}
          showLessLabel={t.showLessStyles}
          moreOptions={options.extraStyles}
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
          onDescriptionChange={(value) =>
            updateFormData("ideaDescription", value)
          }
          referenceImages={formData.referenceImages}
          onReferenceImagesChange={(value) =>
            updateFormData("referenceImages", value)
          }
          labels={t}
          notice={ideaNotice}
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
          note={stepText.note}
          options={options.contactTimes}
          value={formData.contactTimes}
          onChange={(value) => updateFormData("contactTimes", value)}
          multiple
        />
      ),
    };

    return steps[stepId];
  }

  return (
    <main className="form-page" lang={language} dir={direction}>
      <header className="app-topbar">
        <img
          className="topbar-logo"
          src="/images/logo/topbar-logo-white.webp"
          alt="Zen House Tattoo"
          width="150"
          height="56"
          decoding="async"
          fetchPriority="high"
        />
        <ProgressBar
          currentStep={currentStep}
          totalSteps={formSteps.length}
          label={t.step}
          ofLabel={t.of}
        />
        <LanguageSwitcher language={language} onChange={setLanguage} />
      </header>

      <section className="form-stage" aria-label={t.intro}>
        <div
          className={`form-card ${
            ["style", "generalZone", "specificZone", "placement"].includes(
              stepId,
            )
              ? "form-card--wide"
              : ""
          }`}
        >
          {/* <p className="eyebrow">
            {t.step} {currentStep + 1} {t.of} {formSteps.length}
          </p> */}
          <div
            className={`step-motion step-motion--${transitionDirection}`}
            key={stepId}
          >
            {renderStep()}
          </div>

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
            onInvalid={showStepError}
          />
        </div>
      </section>

      {toastMessage ? (
        <div className="app-toast" role="alert">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}
