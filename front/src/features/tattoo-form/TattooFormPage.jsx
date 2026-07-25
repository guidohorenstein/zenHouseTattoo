import { useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
  referenceLinks: [""],
  referenceImages: [],
  timing: "",
  contactTimes: [],
};

function isStepValid(stepId, formData) {
  const length = (value) => value.trim().length;
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    formData.email.trim(),
  );
  const hasIdeaText = length(formData.ideaDescription) >= 10;
  const hasReferenceLink = formData.referenceLinks.some(
    (link) => link.trim().length > 0,
  );
  const hasReferenceImage = formData.referenceImages.length > 0;

  const validations = {
    name:
      length(formData.fullName) >= 3 &&
      hasValidEmail &&
      length(formData.phone) >= 8,
    description: hasIdeaText || hasReferenceLink || hasReferenceImage,
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

export function TattooFormPage() {
  const [language, setLanguage] = useState("he");
  const [currentStep, setCurrentStep] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState("next");
  const [formData, setFormData] = useState(initialFormData);
  const t = translations[language];
  const direction =
    languageOptions.find((option) => option.id === language)?.dir || "ltr";
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
      specificZones: toOptions(
        getSpecificZones(formData.generalZone),
        t,
        (specificZoneId) =>
          getSpecificZoneImageUrl(specificZoneId, formData.bodyReference),
      ),
      styles: toOptions(
        tattooStyles,
        t,
        (styleId) => `/images/tattoo-styles/thumbs/${styleId}.jpg`,
      ),
      colors: toOptions(
        colorModes,
        t,
        (colorModeId) => `/images/color-examples/${colorModeId}.jpeg`,
      ),
      timing: toOptions(timingOptions, t),
      contactTimes: toOptions(contactTimeOptions, t),
    }),
    [formData.bodyReference, formData.generalZone, t],
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
    setTransitionDirection("next");
    setCurrentStep((step) => step + 1);
  }

  function goBack() {
    setTransitionDirection("back");
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  function submit() {
    if (!canGoNext) return;
    window.open(buildWhatsappUrl(formData, t), "_blank", "noopener,noreferrer");
  }

  function showStepError() {
    toast.error(stepError(stepId, t), {
      position: direction === "rtl" ? "top-left" : "top-right",
      theme: "dark",
    });
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
          referenceLinks={formData.referenceLinks}
          onReferenceLinksChange={(value) =>
            updateFormData("referenceLinks", value)
          }
          referenceImages={formData.referenceImages}
          onReferenceImagesChange={(value) =>
            updateFormData("referenceImages", value)
          }
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
    };

    return steps[stepId];
  }

  return (
    <main className="form-page" lang={language} dir={direction}>
      <header className="app-topbar">
        <img
          className="topbar-logo"
          src="/images/logo/topbar-logo-white.png"
          alt="Zen House Tattoo"
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
            ["generalZone", "specificZone", "placement"].includes(stepId)
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

      <ToastContainer
        closeButton={false}
        newestOnTop
        pauseOnFocusLoss={false}
        rtl={direction === "rtl"}
      />
    </main>
  );
}
