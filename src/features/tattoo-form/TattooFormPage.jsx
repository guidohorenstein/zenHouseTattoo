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
  autoAdvanceSteps,
  colorModes,
  tattooStyles,
  contactTimeOptions,
  formSteps,
  timingOptions,
} from "./data/formSteps";
import { languageOptions, translations } from "./data/translations";
import { ContactStep } from "./steps/ContactStep";
import { OptionsStep } from "./steps/OptionsStep";
import { PlacementStep } from "./steps/PlacementStep";
import { IdeaStep } from "./steps/IdeaStep";
import { WelcomeStep } from "./steps/WelcomeStep";
import { trackMetaEvent } from "../../lib/metaPixel";
import { buildWhatsappUrl } from "./utils/buildWhatsappMessage";

const defaultFormSettings = {
  whatsappPhone: "972547505670",
  defaultLanguage: "he",
  formEnabled: true,
  maxReferenceImages: 4,
  maxPlacementBoxes: 3,
};

const STEP_PATHS = {
  welcome: "/start",
  color: "/color",
  style: "/style",
  bodyReference: "/body-reference",
  generalZone: "/body-area",
  specificZone: "/body-placement",
  placement: "/tattoo-placement",
  description: "/idea",
  name: "/details",
  timing: "/timing",
  contactTime: "/contact-time",
  hasTattoos: "/laststep",
};

const MIN_IDEA_CHARACTERS = 15;

const initialFormData = {
  fullName: "",
  email: "",
  phone: "",
  bodyReference: "",
  hasTattoos: "",
  generalZone: "",
  specificZone: "",
  placementBoxes: [],
  styles: "",
  colorMode: "",
  ideaDescription: "",
  referenceImages: [],
  timing: "",
  contactTimes: [],
  acceptedTerms: false,
};

function createSubmissionKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return `submission-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function preloadImage(url) {
  if (!url) return Promise.resolve();

  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (image.decode) {
        image.decode().catch(() => {}).finally(resolve);
      } else {
        resolve();
      }
    };
    image.onerror = resolve;
    image.src = url;
  });
}

function isStepValid(stepId, formData) {
  const length = (value) => value.trim().length;
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    formData.email.trim(),
  );
  const hasIdeaText = length(formData.ideaDescription) >= MIN_IDEA_CHARACTERS;

  const validations = {
    welcome: true,
    name:
      length(formData.fullName) >= 3 &&
      hasValidEmail &&
      length(formData.phone) >= 8 &&
      formData.acceptedTerms,
    description: hasIdeaText,
    bodyReference: Boolean(formData.bodyReference),
    hasTattoos: Boolean(formData.hasTattoos),
    generalZone: Boolean(formData.generalZone),
    specificZone: Boolean(formData.specificZone),
    placement: formData.placementBoxes.length > 0,
    style: Boolean(formData.styles),
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
    .sort((a, b) => getStyleOrder(a, colorMode) - getStyleOrder(b, colorMode))
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

function getStyleGroup(style, colorMode) {
  if (colorMode === "blackGrey") {
    return style.black_grey_placement_group || style.placement_group || "main";
  }

  return style.color_placement_group || style.placement_group || "main";
}

function getStyleOrder(style, colorMode) {
  if (colorMode === "blackGrey") {
    return Number(style.black_grey_sort_order ?? style.sort_order) || 0;
  }

  return Number(style.color_sort_order ?? style.sort_order) || 0;
}

function toFallbackStyleOptions(styleIds, t, colorMode) {
  const basePath =
    colorMode === "blackGrey"
      ? "/images/tattoo-styles/black-grey/thumbs"
      : "/images/tattoo-styles/thumbs";

  return styleIds.map((id) => ({
    id,
    label: t.options[id],
    imageUrl: `${basePath}/${id}.jpg`,
  }));
}

function toMoreStylePreviewOption(previews, colorMode, label) {
  const preview = previews.find((item) => item.color_mode === colorMode);
  if (!preview?.previewUrl) return null;

  return {
    id: `more-styles-${colorMode}`,
    label,
    imageUrl: preview.previewUrl,
    cropData: preview.crop_data,
  };
}

function collectOptionImageUrls(optionList = []) {
  return optionList.map((option) => option.imageUrl).filter(Boolean);
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
  const [transitionPhase, setTransitionPhase] = useState("idle");
  const [ideaNotice, setIdeaNotice] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedInquiryId, setSubmittedInquiryId] = useState("");
  const submitLockRef = useRef(false);
  const languageTouchedRef = useRef(false);
  const submissionKeyRef = useRef(createSubmissionKey());
  const partialLeadSavingRef = useRef(false);
  const partialLeadSignatureRef = useRef("");
  const lastTrackedStepPathRef = useRef("");
  const toastTimerRef = useRef(null);
  const stepTransitionTimerRef = useRef(null);
  const [remoteStyles, setRemoteStyles] = useState([]);
  const [moreStylePreviews, setMoreStylePreviews] = useState([]);
  const [formSettings, setFormSettings] = useState(defaultFormSettings);
  const [remoteBodyPhotos, setRemoteBodyPhotos] = useState({
    categories: [],
    areas: [],
    images: [],
    referenceImages: [],
  });
  const [heTranslations, setHeTranslations] = useState(translations.he);
  const [enTranslations, setEnTranslations] = useState(translations.en);
  const [formData, setFormData] = useState(initialFormData);
  const t = language === "he" ? heTranslations : enTranslations;
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
    return () => {
      window.clearTimeout(toastTimerRef.current);
      window.clearTimeout(stepTransitionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const stepPath = STEP_PATHS[stepId] || "/";
    const suffix = `${window.location.search}${window.location.hash}`;
    const nextUrl = `${stepPath}${suffix}`;
    const currentUrl = `${window.location.pathname}${suffix}`;

    if (currentUrl !== nextUrl) {
      window.history.pushState({ formStep: stepId }, "", nextUrl);
    }

    if (lastTrackedStepPathRef.current !== stepPath) {
      trackMetaEvent("PageView", {
        form_step: stepId,
        form_step_path: stepPath,
      });
      lastTrackedStepPathRef.current = stepPath;
    }
  }, [currentStep, stepId]);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadRemoteContent() {
      try {
        const [
          {
            listPublicBodyPhotos,
            listPublicTattooStyles,
            listPublicFormTexts,
            listPublicFormSettings,
            listPublicMoreStylePreviews,
          },
          { applyTextOverrides },
        ] = await Promise.all([
          import("./services/formContentApi"),
          import("./utils/applyTextOverrides"),
        ]);
        const [
          stylesResult,
          bodyPhotosResult,
          textsResult,
          settingsResult,
          morePreviewsResult,
        ] =
          await Promise.all([
          listPublicTattooStyles(),
          listPublicBodyPhotos(),
          listPublicFormTexts(),
          listPublicFormSettings(),
          listPublicMoreStylePreviews(),
        ]);

        if (!shouldIgnore) {
          setRemoteStyles(stylesResult.styles);
          setMoreStylePreviews(morePreviewsResult.previews);
          setFormSettings(settingsResult.settings);
          if (!languageTouchedRef.current) {
            setLanguage(settingsResult.settings.defaultLanguage);
          }
          setRemoteBodyPhotos({
            categories: bodyPhotosResult.categories,
            areas: bodyPhotosResult.areas,
            images: bodyPhotosResult.images,
            referenceImages: bodyPhotosResult.referenceImages,
          });
          setHeTranslations(applyTextOverrides(translations.he, textsResult.he));
          setEnTranslations(applyTextOverrides(translations.en, textsResult.en));

          const criticalImageUrls = [
            "/images/backgrounds/background.webp",
            "/images/logo/topbar-logo-white.webp",
          ];

          Promise.all(criticalImageUrls.map((url) => preloadImage(url))).catch(() => {});
        }
      } catch {
        // The local fallback form remains usable if remote content is unavailable.
        await Promise.all([
          preloadImage("/images/backgrounds/background.webp"),
          preloadImage("/images/logo/topbar-logo-white.webp"),
        ]);
      }
    }

    loadRemoteContent();

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
      styles: remoteStyles.length
          ? toRemoteStyleOptions(
            remoteStyles.filter(
              (style) => getStyleGroup(style, formData.colorMode) === "main",
            ),
            language,
            formData.colorMode,
          )
        : toFallbackStyleOptions(tattooStyles, t, formData.colorMode),
      extraStyles: toRemoteStyleOptions(
        remoteStyles.filter(
          (style) => getStyleGroup(style, formData.colorMode) === "more",
        ),
        language,
        formData.colorMode,
      ),
      moreStylePreview: toMoreStylePreviewOption(
        moreStylePreviews,
        formData.colorMode,
        t.moreStyles,
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
      moreStylePreviews,
      remoteBodyPhotos,
      remoteStyles,
      t,
    ],
  );

  useEffect(() => {
    const nextStepId = formSteps[currentStep + 1];
    const urlsByStep = {
      color: collectOptionImageUrls(options.colors),
      style: [
        ...collectOptionImageUrls(options.styles),
        ...collectOptionImageUrls(options.extraStyles),
        options.moreStylePreview?.imageUrl,
      ].filter(Boolean),
      bodyReference: collectOptionImageUrls(options.bodyReference),
      generalZone: collectOptionImageUrls(options.generalZones),
      specificZone: collectOptionImageUrls(options.specificZones),
      placement: [placementImageUrl, "/images/placement/placement-guide.gif"].filter(Boolean),
    };
    const urls = [
      ...(urlsByStep[stepId] || []),
      ...(urlsByStep[nextStepId] || []),
    ];

    if (urls.length === 0) return;

    const uniqueUrls = [...new Set(urls)];
    Promise.all(uniqueUrls.map((url) => preloadImage(url))).catch(() => {});
  }, [currentStep, options, placementImageUrl, stepId]);

  function updateFormData(field, value) {
    if (submittedInquiryId) {
      setSubmittedInquiryId("");
      submissionKeyRef.current = createSubmissionKey();
      partialLeadSignatureRef.current = "";
      lastTrackedStepPathRef.current = "";
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
        nextData.styles = "";
      }

      return nextData;
    });

    if (field === "referenceImages" && value.length > 0) {
      setIdeaNotice("");
    }
  }

  async function goNext() {
    if (!canGoNext || isLastStep || transitionPhase !== "idle") return;

    if (stepId === "name") {
      const savedPartialLead = await saveContactLead();
      if (!savedPartialLead) return;
    }

    goToStep(currentStep + 1);
  }

  async function saveContactLead() {
    const partialSnapshot = {
      bodyReference: formData.bodyReference,
      colorMode: formData.colorMode,
      email: formData.email.trim().toLowerCase(),
      fullName: formData.fullName.trim(),
      generalZone: formData.generalZone,
      ideaDescription: formData.ideaDescription.trim(),
      language,
      phone: formData.phone.trim(),
      placementBoxes: formData.placementBoxes,
      referenceImages: formData.referenceImages.map((image) => ({
        name: image.name,
        size: image.size,
      })),
      specificZone: formData.specificZone,
      styles: formData.styles,
      submissionKey: submissionKeyRef.current,
    };
    const signature = [
      partialSnapshot.submissionKey,
      JSON.stringify(partialSnapshot),
    ].join("|");

    if (partialLeadSavingRef.current || partialLeadSignatureRef.current === signature) {
      return partialLeadSignatureRef.current === signature;
    }

    partialLeadSavingRef.current = true;

    try {
      const [{ savePartialInquiry }, { exportMarkedPlacementImage }] = await Promise.all([
        import("./services/savePartialInquiry"),
        import("./utils/exportMarkedPlacementImage"),
      ]);
      const placementImage = await exportMarkedPlacementImage({
        imageUrl: placementImageUrl,
        boxes: formData.placementBoxes,
      });
      const result = await savePartialInquiry(
        formData,
        language,
        submissionKeyRef.current,
        placementImage,
      );

      if (!result.error) {
        partialLeadSignatureRef.current = signature;
        return true;
      }

      showToast(result.error);
      return false;
    } catch (error) {
      console.warn("Partial lead could not be saved:", error);
      showToast("We could not save your details. Please try again.");
      return false;
    } finally {
      partialLeadSavingRef.current = false;
    }
  }

  function goBack() {
    if (transitionPhase !== "idle") return;

    goToStep(Math.max(0, currentStep - 1));
  }

  function goToStep(nextStep) {
    setTransitionPhase("exiting");
    window.clearTimeout(stepTransitionTimerRef.current);
    stepTransitionTimerRef.current = window.setTimeout(() => {
      setCurrentStep(nextStep);
      setTransitionPhase("entering");
      stepTransitionTimerRef.current = window.setTimeout(
        () => setTransitionPhase("idle"),
        240,
      );
    }, 180);
  }

  function selectAndAdvance(field, value) {
    updateFormData(field, value);

    if (currentStep >= formSteps.length - 1 || transitionPhase !== "idle") return;

    window.setTimeout(() => {
      goToStep(Math.min(formSteps.length - 1, currentStep + 1));
    }, 380);
  }

  async function submit() {
    if (!canGoNext || submitLockRef.current) return;

    const whatsappUrl = buildWhatsappUrl(formData, t, formSettings.whatsappPhone);

    if (submittedInquiryId) {
      submitLockRef.current = true;
      setIsSubmitting(true);
      window.location.assign(whatsappUrl);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await performSubmission();

      if (result.error) {
        showToast(result.error);
        return;
      }

      if (!result.duplicate) {
        trackMetaEvent("Lead", {
          content_name: "Tattoo inquiry",
          content_category: "Tattoo consultation",
        });
      }

      setSubmittedInquiryId(result.inquiry?.id || submissionKeyRef.current);
      window.location.assign(whatsappUrl);
    } catch (error) {
      showToast(error.message || "We could not submit the inquiry.");
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function performSubmission() {
    const [{ submitInquiry }, { exportMarkedPlacementImage }] = await Promise.all([
      import("./services/submitInquiry"),
      import("./utils/exportMarkedPlacementImage"),
    ]);
    const placementImage = await exportMarkedPlacementImage({
      imageUrl: placementImageUrl,
      boxes: formData.placementBoxes,
    });

    return submitInquiry(formData, language, submissionKeyRef.current, placementImage);
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
      welcome: <WelcomeStep title={stepText.title} />,
      name: (
        <ContactStep
          title={stepText.title}
          note={stepText.note}
          fullName={formData.fullName}
          email={formData.email}
          phone={formData.phone}
          placeholders={stepText.placeholders}
          terms={t.terms}
          direction={direction}
          acceptedTerms={formData.acceptedTerms}
          onFullNameChange={(value) => updateFormData("fullName", value)}
          onEmailChange={(value) => updateFormData("email", value)}
          onPhoneChange={updatePhone}
          onAcceptedTermsChange={(value) => updateFormData("acceptedTerms", value)}
        />
      ),
      bodyReference: (
        <OptionsStep
          title={stepText.title}
          note={stepText.note}
          options={options.bodyReference}
          value={formData.bodyReference}
          onChange={(value) => selectAndAdvance("bodyReference", value)}
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
          onChange={(value) => selectAndAdvance("generalZone", value)}
        />
      ),
      specificZone: (
        <OptionsStep
          title={stepText.title}
          options={options.specificZones}
          value={formData.specificZone}
          onChange={(value) => selectAndAdvance("specificZone", value)}
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
          maxPlacementBoxes={formSettings.maxPlacementBoxes}
        />
      ),
      style: (
        <OptionsStep
          title={stepText.title}
          options={options.styles}
          value={formData.styles}
          onChange={(value) => selectAndAdvance("styles", value)}
          variant="styles"
          moreLabel={t.moreStyles}
          showLessLabel={t.showLessStyles}
          moreOptions={options.extraStyles}
          morePreviewOption={options.moreStylePreview}
        />
      ),
      color: (
        <OptionsStep
          title={stepText.title}
          options={options.colors}
          value={formData.colorMode}
          onChange={(value) => selectAndAdvance("colorMode", value)}
        />
      ),
      description: (
        <IdeaStep
          title={stepText.title}
          ideaLabel={stepText.ideaLabel}
          uploadLabel={stepText.uploadLabel}
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
          maxReferenceImages={formSettings.maxReferenceImages}
          minCharacters={MIN_IDEA_CHARACTERS}
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
        <LanguageSwitcher
          language={language}
          onChange={(nextLanguage) => {
            languageTouchedRef.current = true;
            setLanguage(nextLanguage);
          }}
        />
      </header>

      <section className="form-stage" aria-label={t.intro}>
        <div
          className={`form-card form-card--${stepId} ${
            ["style", "generalZone", "specificZone", "placement"].includes(
              stepId,
            )
              ? "form-card--wide"
              : ""
          }`}
        >
          {!formSettings.formEnabled ? (
            <div className="step">
              <h1>Zen House Tattoo</h1>
              <p>
                The consultation form is temporarily paused. Please try again later.
              </p>
            </div>
          ) : (
            <>
          {/* <p className="eyebrow">
            {t.step} {currentStep + 1} {t.of} {formSteps.length}
          </p> */}
          <div
            className={`step-motion step-motion--${transitionPhase}`}
            key={stepId}
          >
            {renderStep()}
          </div>

          <FormNavigation
            backLabel={t.back}
            nextLabel={
              stepId === "welcome"
                ? t.start
                : stepId === "name"
                  ? t.submitDetails
                  : t.next
            }
            quoteLabel={t.quote}
            canGoBack={currentStep > 0}
            canGoNext={canGoNext}
            isLastStep={isLastStep}
            hideNext={
              autoAdvanceSteps.includes(stepId) &&
              !["timing", "contactTime"].includes(stepId)
            }
            isSubmitting={isSubmitting}
            submittingLabel="Sending..."
            onBack={goBack}
            onNext={goNext}
            onSubmit={submit}
            onInvalid={showStepError}
          />

          {isSubmitting ? (
            <div className="submit-loader-overlay" role="status" aria-live="polite">
              <span className="submit-loader-spinner" aria-hidden="true" />
              <p>{t.submitting}</p>
            </div>
          ) : null}
            </>
          )}
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














