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
  formSteps,
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

function createSubmissionKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return `submission-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

function toRemoteStyleOptions(styles, language, colorMode) {
  return styles
    .filter((style) =>
      colorMode === "blackGrey" ? style.hasBlackGrey : style.hasColor,
    )
    .map((style) => ({
      id: style.slug,
      label: language === "he" ? style.title_he : style.title_en,
      imageUrl:
        colorMode === "blackGrey"
          ? style.blackGreyPreviewUrl
          : style.colorPreviewUrl,
      cropData:
        colorMode === "blackGrey"
          ? style.black_grey_crop_data
          : style.color_crop_data,
    }));
}

function getRemoteBodyImage(bodyPhotos, { areaId, bodyReference, categoryId, imageRole }) {
  return bodyPhotos.images.find((item) => {
    const matchesTarget = areaId
      ? item.body_area_id === areaId
      : item.category_id === categoryId;

    return (
      matchesTarget &&
      item.body_reference === bodyReference &&
      item.image_role === imageRole
    );
  });
}

function getRemoteBodyImageUrl(bodyPhotos, options) {
  return getRemoteBodyImage(bodyPhotos, options)?.previewUrl || "";
}

function getRemoteBodyReferenceImage(bodyPhotos, bodyReference) {
  return bodyPhotos.referenceImages.find(
    (item) => item.body_reference === bodyReference,
  );
}

function getRemoteBodyReferenceImageUrl(bodyPhotos, bodyReference) {
  return getRemoteBodyReferenceImage(bodyPhotos, bodyReference)?.previewUrl || "";
}

export function TattooFormPage() {
  const [language, setLanguage] = useState("he");
  const [currentStep, setCurrentStep] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState("next");
  const [ideaNotice, setIdeaNotice] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedInquiryId, setSubmittedInquiryId] = useState("");
  const submitLockRef = useRef(false);
  const submissionKeyRef = useRef(createSubmissionKey());
  const toastTimerRef = useRef(null);
  const [remoteStyles, setRemoteStyles] = useState([]);
  const [remoteBodyPhotos, setRemoteBodyPhotos] = useState({
    categories: [],
    areas: [],
    images: [],
    referenceImages: [],
  });
  const [formData, setFormData] = useState(initialFormData);
  const t = translations[language];
  const direction =
    languageOptions.find((option) => option.id === language)?.dir || "ltr";
  const stepId = formSteps[currentStep];
  const canGoNext = isStepValid(stepId, formData);
  const isLastStep = currentStep === formSteps.length - 1;
  const selectedRemoteArea = remoteBodyPhotos.areas.find(
    (area) => area.slug === formData.specificZone,
  );
  const placementImageUrl =
    (selectedRemoteArea
      ? getRemoteBodyImageUrl(remoteBodyPhotos, {
          areaId: selectedRemoteArea.id,
          bodyReference: formData.bodyReference,
          imageRole: "placement",
        })
      : "") || getZoneImageUrl(formData);

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadRemoteStyles() {
      const { listPublicBodyPhotos, listPublicTattooStyles } = await import(
        "./services/formContentApi"
      );
      const [stylesResult, bodyPhotosResult] = await Promise.all([
        listPublicTattooStyles(),
        listPublicBodyPhotos(),
      ]);

      if (!shouldIgnore) {
        setRemoteStyles(stylesResult.styles);
        setRemoteBodyPhotos({
          categories: bodyPhotosResult.categories,
          areas: bodyPhotosResult.areas,
          images: bodyPhotosResult.images,
          referenceImages: bodyPhotosResult.referenceImages,
        });
      }
    }

    loadRemoteStyles();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  function showToast(message) {
    setToastMessage(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(""), 3200);
  }

  const options = useMemo(
    () => {
      const hasRemoteBodyPhotos = remoteBodyPhotos.categories.length > 0;
      const remoteCategoryOptions = remoteBodyPhotos.categories.map((category) => {
        const image = getRemoteBodyImage(remoteBodyPhotos, {
          categoryId: category.id,
          bodyReference: formData.bodyReference,
          imageRole: "card",
        });

        return {
          id: category.slug,
          label: language === "he" ? category.title_he : category.title_en,
          imageUrl: image?.previewUrl || "",
          cropData: image?.crop_data,
        };
      });
      const selectedRemoteCategory = remoteBodyPhotos.categories.find(
        (category) => category.slug === formData.generalZone,
      );
      const remoteAreaOptions = remoteBodyPhotos.areas
        .filter((area) => area.category_id === selectedRemoteCategory?.id)
        .map((area) => {
          const image = getRemoteBodyImage(remoteBodyPhotos, {
            areaId: area.id,
            bodyReference: formData.bodyReference,
            imageRole: "card",
          });

          return {
            id: area.slug,
            label: language === "he" ? area.title_he : area.title_en,
            imageUrl: image?.previewUrl || "",
            cropData: image?.crop_data,
          };
        });

      return {
        bodyReference: toOptions(["male", "female"], t, (referenceId) =>
          getRemoteBodyReferenceImageUrl(remoteBodyPhotos, referenceId) ||
          getBodyReferenceImageUrl(referenceId),
        ).map((option) => ({
          ...option,
          cropData: getRemoteBodyReferenceImage(remoteBodyPhotos, option.id)?.crop_data,
        })),
      hasTattoos: toOptions(["yes", "no"], t),
      generalZones: hasRemoteBodyPhotos
        ? remoteCategoryOptions
        : generalZones.map((zone) => ({
            id: zone.id,
            label: t.options[zone.id],
            imageUrl: getGeneralZoneImageUrl(zone.id, formData.bodyReference),
          })),
      specificZones: hasRemoteBodyPhotos
        ? remoteAreaOptions
        : toOptions(
            getSpecificZones(formData.generalZone),
            t,
            (specificZoneId) =>
              getSpecificZoneImageUrl(specificZoneId, formData.bodyReference),
          ),
      styles: toRemoteStyleOptions(
        remoteStyles.filter((style) => style.placement_group === "main"),
        language,
        formData.colorMode,
      ),
      extraStyles: toRemoteStyleOptions(
        remoteStyles.filter((style) => style.placement_group === "more"),
        language,
        formData.colorMode,
      ),
      colors: toOptions(
        colorModes,
        t,
        (colorModeId) => `/images/color-examples/${colorModeId}.jpeg`,
      ),
      timing: toOptions(timingOptions, t),
      contactTimes: toOptions(contactTimeOptions, t),
      };
    },
    [
      formData.bodyReference,
      formData.colorMode,
      formData.generalZone,
      language,
      remoteBodyPhotos,
      remoteStyles,
      t,
    ],
  );

  function updateFormData(field, value) {
    if (submittedInquiryId) {
      setSubmittedInquiryId("");
      submissionKeyRef.current = createSubmissionKey();
    }

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
    if (!canGoNext || submitLockRef.current) return;

    const whatsappUrl = buildWhatsappUrl(formData, t);

    if (submittedInquiryId) {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    const whatsappWindow = window.open("about:blank", "_blank");
    if (whatsappWindow) whatsappWindow.opener = null;

    try {
      const [{ submitInquiry }, { exportMarkedPlacementImage }] = await Promise.all([
        import("./services/submitInquiry"),
        import("./utils/exportMarkedPlacementImage"),
      ]);
      const placementImage = await exportMarkedPlacementImage({
        imageUrl: placementImageUrl,
        boxes: formData.placementBoxes,
      });
      const result = await submitInquiry(
        formData,
        language,
        submissionKeyRef.current,
        placementImage,
      );

      if (result.error) {
        whatsappWindow?.close();
        showToast(result.error);
        return;
      }

      setSubmittedInquiryId(result.inquiry?.id || submissionKeyRef.current);

      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      whatsappWindow?.close();
      showToast(error.message || "We could not submit the inquiry.");
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
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
          imageUrl={placementImageUrl}
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
            isSubmitting={isSubmitting}
            submittingLabel="Sending..."
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














