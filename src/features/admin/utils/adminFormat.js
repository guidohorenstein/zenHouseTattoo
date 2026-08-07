export const statusLabels = {
  requested: "Requested",
  no_response: "No response",
  quoted: "Quoted",
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const statusDescriptions = {
  requested: "New request that has not been handled yet.",
  no_response: "The client was contacted but did not answer.",
  quoted: "A price or estimate was sent to the client.",
  booked: "The client booked an appointment.",
  completed: "The tattoo/session was completed.",
  cancelled: "The request was discarded or cancelled.",
};

export const valueLabels = {
  blackGrey: "Black & grey",
  color: "Color",
  now: "ASAP",
  weeks: "Next weeks",
  month: "Next month",
  dontCare: "I don't care",
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
  male: "Male",
  female: "Female",
  yes: "Yes",
  no: "No",
};

export function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatValue(value) {
  if (!value) return "-";
  return valueLabels[value] || humanize(value);
}

export function formatList(values) {
  if (!values || values.length === 0) return "-";
  return values.map(formatValue).join(", ");
}

export function humanize(value) {
  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
