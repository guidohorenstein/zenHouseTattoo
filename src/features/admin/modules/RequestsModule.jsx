import { useMemo, useState } from "react";
import { getZoneImageUrl } from "../../tattoo-form/data/bodyZones";
import { StatusBadge } from "../components/StatusBadge";
import { inquiryStatuses } from "../services/inquiriesApi";
import {
  formatDate,
  formatList,
  formatValue,
  statusDescriptions,
  statusLabels,
} from "../utils/adminFormat";

const emptyFilters = {
  search: "",
  status: "all",
  timing: "all",
  contactTime: "all",
  dateFrom: "",
  dateTo: "",
  sortOrder: "newest",
};

export function RequestsModule({
  activeFilter,
  detailLoading,
  includeArchived,
  inquiries,
  noteText,
  selectedDetail,
  onAddNote,
  onArchive,
  onDelete,
  onDiscard,
  onDrillUp,
  onNoteTextChange,
  onRequestDetail,
  onStatusChange,
  onToggleArchived,
  permissions,
}) {
  const [filters, setFilters] = useState(emptyFilters);
  const [expandedId, setExpandedId] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inquiry) => {
      const search = filters.search.trim().toLowerCase();
      const matchesSearch = !search || [inquiry.full_name, inquiry.email, inquiry.phone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search));
      const matchesStatus = filters.status === "all" || inquiry.status === filters.status;
      const matchesTiming = filters.timing === "all" || inquiry.timing === filters.timing;
      const matchesContact =
        filters.contactTime === "all" || inquiry.contact_times?.includes(filters.contactTime);
      const inquiryDate = new Date(inquiry.created_at);
      const fromDate = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
      const toDate = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;
      const matchesDateFrom = !fromDate || inquiryDate >= fromDate;
      const matchesDateTo = !toDate || inquiryDate <= toDate;
      const matchesDrill = !activeFilter || matchesActiveFilter(inquiry, activeFilter);

      return (
        matchesSearch
        && matchesStatus
        && matchesTiming
        && matchesContact
        && matchesDateFrom
        && matchesDateTo
        && matchesDrill
      );
    }).sort((firstInquiry, secondInquiry) => {
      const firstDate = new Date(firstInquiry.created_at).getTime();
      const secondDate = new Date(secondInquiry.created_at).getTime();

      return filters.sortOrder === "oldest"
        ? firstDate - secondDate
        : secondDate - firstDate;
    });
  }, [activeFilter, filters, inquiries]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
    onDrillUp();
  }

  function toggleInquiry(inquiry) {
    const nextId = expandedId === inquiry.id ? "" : inquiry.id;
    setExpandedId(nextId);

    if (nextId && inquiry.recordType !== "partial") onRequestDetail(nextId);
  }

  return (
    <section className="admin-module-stack">
      <div className="admin-white-panel admin-filters-panel">
        <div className="admin-filters-heading">
          <div>
            <span>Request filters</span>
            <strong>{filteredInquiries.length} visible</strong>
          </div>
          <button className="admin-light-button" type="button" onClick={clearFilters}>Clear filters</button>
        </div>

        <div className="admin-filter-search">
          <label>
            Search
            <input
              value={filters.search}
              placeholder="Name, email or phone"
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </label>
        </div>

        <div className="admin-filter-group">
          <label>
            Status
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="all">All statuses</option>
              <option value="partial">Partial leads</option>
              {inquiryStatuses.map((status) => (
                <option key={status} value={status}>{statusLabels[status]}</option>
              ))}
            </select>
          </label>
          <label>
            Timing
            <select value={filters.timing} onChange={(event) => updateFilter("timing", event.target.value)}>
              <option value="all">Any timing</option>
              <option value="now">ASAP</option>
              <option value="weeks">Next weeks</option>
              <option value="month">Next month</option>
              <option value="dontCare">I don't care</option>
            </select>
          </label>
          <label>
            Contact time
            <select value={filters.contactTime} onChange={(event) => updateFilter("contactTime", event.target.value)}>
              <option value="all">Any time</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="night">Night</option>
            </select>
          </label>
        </div>

        <div className="admin-filter-group admin-filter-group--date">
          <label>
            From
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </label>
          <label>
            Arrival order
            <select value={filters.sortOrder} onChange={(event) => updateFilter("sortOrder", event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>

        <label className="admin-archive-toggle">
          <input
            checked={includeArchived}
            type="checkbox"
            onChange={(event) => onToggleArchived(event.target.checked)}
          />
          Show archived requests
        </label>
      </div>
      {activeFilter ? (
        <div className="admin-filter-banner">
          <span>Filtered by {activeFilter.label}: {formatValue(activeFilter.value)}</span>
          <button type="button" onClick={onDrillUp}>Clear filter</button>
        </div>
      ) : null}

      <div className="admin-requests-header">
        <div>
          <h3>Requests</h3>
          <p>{filteredInquiries.length} of {inquiries.length} visible</p>
        </div>
      </div>

      <div className="admin-request-list">
        {filteredInquiries.length === 0 ? (
          <section className="admin-white-panel"><p className="admin-muted-light">No requests match these filters.</p></section>
        ) : null}

        {filteredInquiries.map((inquiry) => (
          <RequestCard
            detail={selectedDetail?.inquiry?.id === inquiry.id ? selectedDetail : null}
            detailLoading={detailLoading && expandedId === inquiry.id}
            expanded={expandedId === inquiry.id}
            inquiry={inquiry}
            key={inquiry.id}
            noteText={noteText}
            onAddNote={onAddNote}
            onArchive={onArchive}
            onDelete={onDelete}
            onDiscard={onDiscard}
            onImagePreview={setPreviewImage}
            onNoteTextChange={onNoteTextChange}
            onStatusChange={onStatusChange}
            permissions={permissions}
            onToggle={() => toggleInquiry(inquiry)}
          />
        ))}
      </div>

      {previewImage ? (
        <ImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
      ) : null}
    </section>
  );
}

function RequestCard({
  detail,
  detailLoading,
  expanded,
  inquiry,
  noteText,
  onAddNote,
  onArchive,
  onDelete,
  onDiscard,
  onImagePreview,
  onNoteTextChange,
  onStatusChange,
  permissions,
  onToggle,
}) {
  return (
    <article className={`admin-request-card ${expanded ? "is-expanded" : ""} ${
      inquiry.archived_at ? "is-archived" : ""
    } ${inquiry.recordType === "partial" ? "is-partial" : ""}`}>
      <button className="admin-request-summary" type="button" onClick={onToggle}>
        <div>
          <strong>{inquiry.full_name}</strong>
          <span>{formatDate(inquiry.created_at)}</span>
        </div>
        <div>
          <span>{inquiry.email}</span>
          <span>{inquiry.phone}</span>
        </div>
        <div>
          {inquiry.recordType === "partial" ? (
            <>
              <span>Contact step only</span>
              <span>Form not submitted</span>
            </>
          ) : (
            <>
              <span>{formatList(inquiry.contact_times)}</span>
              <span>{formatValue(inquiry.timing)}</span>
            </>
          )}
        </div>
        <span className="admin-summary-status-stack">
          <StatusBadge status={inquiry.status} />
          {inquiry.archived_at ? <span className="admin-archived-pill">Archived</span> : null}
        </span>
      </button>

      {expanded ? (
        <div className="admin-request-expanded">
          {detailLoading ? <p className="admin-muted-light">Loading full request...</p> : null}
          {inquiry.recordType === "partial" ? (
            <PartialRequestDetail
              inquiry={inquiry}
              onArchive={onArchive}
              onDelete={onDelete}
              permissions={permissions}
            />
          ) : detail?.inquiry ? (
            <RequestDetail
            detail={detail}
            noteText={noteText}
            onAddNote={onAddNote}
              onArchive={onArchive}
            onDelete={onDelete}
              onDiscard={onDiscard}
              onImagePreview={onImagePreview}
              onNoteTextChange={onNoteTextChange}
              onStatusChange={onStatusChange}
              permissions={permissions}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function PartialRequestDetail({ inquiry, onArchive, onDelete, permissions }) {
  return (
    <div className="admin-partial-detail-grid">
      <section className="admin-detail-section admin-partial-detail-card">
        <h4>Partial lead</h4>
        <p>
          This person completed the contact step but did not finish the tattoo request.
        </p>
        <div className="admin-info-grid">
          <DetailItem label="Name" value={inquiry.full_name} />
          <DetailItem label="Email" value={inquiry.email} />
          <DetailItem label="Phone" value={inquiry.phone} />
          <DetailItem label="Language" value={inquiry.source_language?.toUpperCase()} />
          <DetailItem label="Captured" value={formatDate(inquiry.created_at)} />
          <DetailItem label="Last update" value={formatDate(inquiry.updated_at)} />
        </div>
      </section>

      <section className="admin-detail-section admin-detail-section--compact admin-partial-actions">
        <h4>Actions</h4>
        <div className="admin-danger-actions">
          <button disabled={!permissions?.canEditRequests} type="button" onClick={() => onArchive(inquiry)}>
            {inquiry.archived_at ? "Restore partial lead" : "Archive partial lead"}
          </button>
          <button disabled={!permissions?.canEditRequests} type="button" onClick={() => onDelete(inquiry)}>
            Delete permanently
          </button>
        </div>
      </section>
    </div>
  );
}

function RequestDetail({
  detail,
  noteText,
  onAddNote,
  onArchive,
  onDelete,
  onDiscard,
  onImagePreview,
  onNoteTextChange,
  onStatusChange,
  permissions,
}) {
  const inquiry = detail.inquiry;

  return (
    <div className="admin-request-detail-grid">
      <div className="admin-request-detail-column">
        <section className="admin-detail-section">
          <h4>Request details</h4>
          <div className="admin-info-grid">
            <DetailItem label="Language" value={inquiry.source_language?.toUpperCase()} />
            <DetailItem label="Color" value={formatValue(inquiry.color_mode)} />
            <DetailItem label="Timing" value={formatValue(inquiry.timing)} />
            <DetailItem label="Contact" value={formatList(inquiry.contact_times)} />
            <DetailItem label="Body" value={formatValue(inquiry.body_reference)} />
            <DetailItem label="Area" value={formatValue(inquiry.general_zone)} />
            <DetailItem label="View" value={formatValue(inquiry.specific_zone)} />
            <DetailItem label="Has tattoos" value={formatValue(inquiry.has_tattoos)} />
          </div>
          <TextBlock title="Idea" text={inquiry.idea_description} />
          <TextBlock title="Styles" text={formatList(inquiry.styles)} />
        </section>

        <section className="admin-detail-section admin-detail-section--media">
          <h4>Images</h4>
          <MediaPreviewStrip
            images={detail.images}
            inquiry={inquiry}
            onImagePreview={onImagePreview}
          />
        </section>
      </div>

      <div className="admin-request-detail-column admin-request-detail-column--side">
        <section className="admin-detail-section admin-detail-section--compact admin-detail-section--status">
          <h4>Status</h4>
          <div className="admin-status-actions">
            {inquiryStatuses.map((status) => (
              <button
                className={`admin-chip admin-chip--${status} ${inquiry.status === status ? "is-active" : ""}`}
                disabled={!permissions?.canEditRequests}
                key={status}
                title={statusDescriptions[status]}
                type="button"
                onClick={() => onStatusChange(inquiry, status)}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
          <div className="admin-danger-actions">
            <button disabled={!permissions?.canEditRequests} type="button" onClick={() => onArchive(inquiry)}>
              {inquiry.archived_at ? "Restore request" : "Archive request"}
            </button>
            <button disabled={!permissions?.canEditRequests} type="button" onClick={() => onDiscard(inquiry)}>Discard request</button>
            <button disabled={!permissions?.canEditRequests} type="button" onClick={() => onDelete(inquiry)}>Delete permanently</button>
          </div>
        </section>

        <section className="admin-detail-section admin-detail-section--compact admin-detail-section--history">
          <h4>Status history</h4>
          <Timeline
            emptyText="No status changes yet."
            items={detail.statusEvents.map((event) => ({
              id: event.id,
              text: `${statusLabels[event.from_status] || "New"} to ${statusLabels[event.to_status]}`,
              date: event.created_at,
            }))}
          />
        </section>

        <section className="admin-detail-section admin-detail-section--compact admin-detail-section--notes">
          <h4>Internal notes</h4>
          <form className="admin-note-form admin-note-form--light" onSubmit={(event) => onAddNote(event, inquiry.id)}>
            <textarea
              disabled={!permissions?.canEditRequests}
              value={noteText}
              placeholder={permissions?.canEditRequests ? "Add a private note..." : "Viewer mode: notes are read-only"}
              onChange={(event) => onNoteTextChange(event.target.value)}
            />
            <button className="admin-primary-light" disabled={!permissions?.canEditRequests} type="submit">Add note</button>
          </form>
          <Timeline emptyText="No notes yet." items={detail.notes.map((note) => ({ id: note.id, text: note.note, date: note.created_at }))} />
        </section>
      </div>
    </div>
  );
}
function MediaPreviewStrip({ images, inquiry, onImagePreview }) {
  const placementImageUrl = inquiry.placementMarkedImageUrl || getZoneImageUrl({
    bodyReference: inquiry.body_reference,
    specificZone: inquiry.specific_zone,
  });
  const shouldDrawPlacementBoxes = !inquiry.placementMarkedImageUrl;

  return (
    <div className="admin-media-strip">
      <div className="admin-reference-cluster">
        {images?.length > 0 ? (
          images.slice(0, 4).map((image, index) => (
            <button
              className="admin-reference-thumb"
              key={image.id}
              type="button"
              onClick={() => onImagePreview({
                alt: image.original_name || `Reference ${index + 1}`,
                src: image.previewUrl,
              })}
            >
              {image.previewUrl ? <img src={image.previewUrl} alt="" /> : null}
              <span>{index + 1}</span>
            </button>
          ))
        ) : (
          <div className="admin-reference-empty">
            Reference upload pending secure backend.
          </div>
        )}
      </div>

      <button
        className="admin-placement-preview"
        type="button"
        onClick={() => onImagePreview({
          alt: "Marked placement",
          boxes: inquiry.placement_boxes || [],
          src: placementImageUrl,
        })}
      >
        <PlacementImage
          imageUrl={placementImageUrl}
          boxes={shouldDrawPlacementBoxes ? inquiry.placement_boxes || [] : []}
        />
        <span>Placement</span>
      </button>
    </div>
  );
}

function PlacementImage({ imageUrl, boxes }) {
  return (
    <span className="admin-placement-image-wrap">
      <img src={imageUrl} alt="Marked body placement" />
      {boxes.map((box) => (
        <span
          className="admin-placement-box"
          key={box.id || `${box.x}-${box.y}-${box.width}-${box.height}`}
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
          }}
        />
      ))}
    </span>
  );
}

function ImageLightbox({ image, onClose }) {
  return (
    <div className="admin-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button className="admin-lightbox-close" type="button" onClick={onClose}>Close</button>
      <div className="admin-lightbox-content" onClick={(event) => event.stopPropagation()}>
        {image.boxes ? (
          <PlacementImage imageUrl={image.src} boxes={image.boxes} />
        ) : (
          <img src={image.src} alt={image.alt} />
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="admin-info-item">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function TextBlock({ title, text }) {
  return (
    <div className="admin-text-block">
      <span>{title}</span>
      <p>{text || "-"}</p>
    </div>
  );
}

function Timeline({ emptyText, items }) {
  if (items.length === 0) return <p className="admin-muted-light">{emptyText}</p>;

  return (
    <div className="admin-note-list admin-note-list--light">
      {items.map((item) => (
        <article className="admin-note admin-note--light" key={item.id}>
          <p>{item.text}</p>
          <span>{formatDate(item.date)}</span>
        </article>
      ))}
    </div>
  );
}

function matchesActiveFilter(inquiry, activeFilter) {
  if (activeFilter.type === "status") return inquiry.status === activeFilter.value;
  if (activeFilter.type === "timing") return inquiry.timing === activeFilter.value;
  if (activeFilter.type === "contactTime") return inquiry.contact_times?.includes(activeFilter.value);
  if (activeFilter.type === "style") return inquiry.styles?.includes(activeFilter.value);
  if (activeFilter.type === "generalZone") return inquiry.general_zone === activeFilter.value;
  return true;
}











