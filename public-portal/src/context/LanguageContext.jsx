import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

/*
 * Translation policy
 * -------------------
 * `en` holds the authoritative copy. `tl` entries marked null are
 * NOT yet translated and deliberately render the English string rather than
 * machine-translated text: unofficial Tagalog for legal or civic copy would
 * misrepresent the municipality's voice.
 *
 * `tl` values that ARE populated are working drafts. They have not been
 * reviewed by the municipality and should be treated as provisional.
 * See LANG_STATUS below for the authoritative list of what still needs a
 * human translator.
 */
const translations = {
  en: {
    home: 'Home',
    ordinanceNav: 'Ordinance',
    ordinances: 'Ordinances',
    resolutions: 'Resolutions',
    sessions: 'Sessions',
    committees: 'Committees',
    members: 'SB Members',
    newsNav: 'News',
    about: 'About',
    portalSubtitle: 'Official Legislative Tracking Portal',
    overview: 'Overview',
    sessionHistory: 'Session History',
    publicConsultation: 'Public Consultation (Active)',
    submitFeedback: 'Submit Feedback',
    submittingFeedback: 'Submitting…',
    backToArchive: 'Back to Archive',
    dateFiled: 'Date Filed',
    committee: 'Committee',
    effectivityDate: 'Effectivity Date',
    plainLanguageSummary: 'Plain Language Summary',
    noSummary: 'No plain language summary provided yet.',
    documents: 'Documents',
    viewPdf: 'View PDF',
    downloadCopy: 'Download Copy',

    // Shell
    officialService: 'Official public service',
    officialUpdates: 'Official updates',
    openParticipation: 'Open participation welcome',
    sbFullName: 'Sangguniang Bayan of Bongabong',
    search: 'Search',
    openNavigation: 'Open navigation',
    closeNavigation: 'Close navigation',
    navigate: 'Navigate',
    exploreRecord: 'Explore the record',
    whatsNew: "What's new",
    footerTagline: 'The public record for Bongabong',
    exploreTheRecord: 'Explore the record',
    publicInfoDesk: 'Public information desk',
    contactMe: 'Contact Me',
    switchLanguage: 'Switch language',

    // Home bands
    officialPublicRecord: 'Official public record',
    heroHeadline: 'Good government starts with knowing what happened.',
    heroLede: 'Follow the decisions that shape your streets, schools, businesses, and future. Then make your voice easier to hear.',
    heroByline: 'Official records published by the Sangguniang Bayan of Bongabong',
    approvedOrdinances: 'Approved ordinances',
    approvedResolutions: 'Approved resolutions',
    ordinancesRecorded: 'Ordinances recorded',
    resolutionsRecorded: 'Resolutions recorded',
    openForCommentCount: 'Open for comment',
    maximumPhotoSize: 'Maximum photo size: 25 MB.',
    loadingContent: 'Loading content…',
    theCouncil: 'The council',
    councilHeading: 'The council of Bongabong',
    councilBlurb: 'The body that studies, debates, and acts on local measures.',
    seeFullMemberProfiles: 'See full member profiles',
    newsAndUpdates: 'News and updates',
    newsBlurb: 'What is happening in Bongabong',
    informationalOnly: 'Informational only. News is not a local law.',
    viewAllUpdates: 'View all updates',
    takePart: 'Take part',
    openForComment: 'Open for comment',
    openBlurb: 'Read what is being considered and leave a verified comment before the public hearing.',
    seeOpenConsultations: 'See open consultations',
    decisions: 'Decisions',
    latestRecords: 'Latest records',
    recordsBlurb: 'What is being decided.',
    viewFullArchive: 'View full archive',
    publicCalendar: 'Public calendar',
    sessionsBlurb: 'Sessions, readings, and votes are published in the minutes.',
    seePublicCalendar: 'See the public calendar',
    searchArchive: 'Search the public archive',
    findRecord: 'Find a record in a few words.',
    findRecordBlurb: 'Search by ordinance number, title, committee, or keyword.',
    searchPlaceholder: 'Title, number, committee, or keyword',
    liveDataUnavailable: 'Live civic data is temporarily unavailable.',
    liveDataBlurb: 'Some figures below may be missing. The public API may not be running.',

    // ---- Archive / Ordinances ----
    searchRecords: 'Search records',
    searchRecordsPlaceholder: 'Title, number, committee, or sponsor',
    committeeLabel: 'Committee',
    statusLabel: 'Status',
    allCommittees: 'All committees',
    allStatuses: 'All statuses',
    viewDetails: 'View details',
    downloadPdf: 'Download PDF',
    noRecordsMatch: 'No documents found matching your criteria.',
    pageOf: 'Page {current} of {total}',
    previous: 'Previous',
    next: 'Next',

    // ---- Sessions ----
    sessionsTitle: 'SB Sessions & Minutes',
    sessionsLede: "Review the records of the Sangguniang Bayan's regular and special sessions, including the topics discussed and official minutes.",
    downloadMinutes: 'Download minutes',
    minutesNotPublished: 'Minutes not published',
    noSessions: 'No sessions recorded yet.',
    keyItemsDiscussed: 'Key items discussed',

    // ---- Members ----
    membersTitle: 'The Sangguniang Bayan',
    presidingOfficer: 'Presiding officer',
    municipalViceMayor: 'Municipal Vice Mayor',
    sbMembers: 'Sangguniang Bayan members',
    chairmanship: 'Chairmanship',
    committeeAssignments: 'Committee assignments',
    committeeChairRole: 'Chair',
    committeeViceChairRole: 'Vice Chair',
    committeeMemberRole: 'Member',
    viewAllCommitteeAssignments: 'View all {count} committee assignments',
    readFullBiography: 'Read full biography',
    hideFullBiography: 'Hide full biography',
    termOfService: 'Term of service',
    contactOffice: 'Contact office',
    noProfiles: 'No member profiles found.',

    // ---- Committees ----
    committeesTitle: 'Legislative Committees',
    searchDirectory: 'Search directory',
    chairperson: 'Chairperson',
    viceChairperson: 'Vice-chairperson',
    standingCommittee: 'Standing committee',
    toBeDesignated: 'To be designated',

    // ---- About ----
    aboutTitle: 'About the Sangguniang Bayan',
    aboutLede: 'Tungkol sa Sangguniang Bayan ng Bongabong.',
    officialSeal: 'The official seal',
    legislativeBody: 'The legislative body',
    legislativeProcess: 'The legislative process',
    howMeasureBecomesLaw: 'How a proposed measure becomes a municipal law.',
    // Legislative process steps. Official process names; Tagalog left null
    // rather than invented, since these are legal stages with fixed wording.
    firstReadingTitle: 'First reading',
    firstReadingDesc: 'The proposed measure is read by title and referred to the appropriate committee for study.',
    committeeHearingTitle: 'Committee hearing & public consultation',
    committeeHearingDesc: 'The committee deliberates and conducts hearings. For ordinances, a public consultation is often held where citizens can voice their opinions.',
    secondThirdReadingTitle: 'Second & third reading',
    secondThirdReadingDesc: 'The measure is debated and voted upon by the entire council.',
    approvalTitle: 'Approval',
    approvalDesc: 'If passed, it is forwarded to the Mayor for signature and approval.',
    // Core values and the mission statement. Prose describing the municipality's
    // own commitments; Tagalog needs a human reviewer.
    coreValueIntegrity: 'Integrity',
    coreValueIntegrityDesc: 'Unwavering adherence to moral and ethical principles in public service.',
    coreValueTransparency: 'Transparency',
    coreValueTransparencyDesc: 'Open and accessible governance processes fostering public trust.',
    coreValueResilience: 'Resilience',
    coreValueResilienceDesc: 'Legislative foresight to build a community capable of withstanding future challenges.',
    coreValueEquity: 'Equity',
    coreValueEquityDesc: 'Ensuring fair and impartial allocation of resources and opportunities for all.',
    missionPoint1: 'To enact responsive and inclusive ordinances that promote economic vitality and social equity.',
    missionPoint2: 'To institutionalize transparency and accountability in all facets of local governance.',
    missionPoint3: 'To safeguard our natural resources through sustainable environmental policies.',
    missionPoint4: 'To empower constituent participation in the legislative process, bridging the gap between the government and the governed.',
    firstReading: 'First reading',
    committeeHearing: 'Committee hearing & public consultation',
    secondThirdReading: 'Second & third reading',
    approval: 'Approval',
    contactUs: 'Contact us',

    // ---- Vision & Mission ----
    visionMissionTitle: 'Institutional vision, mission & core values',
    municipalVision: 'Municipal vision',
    strategicMission: 'Strategic mission',
    corePrinciples: 'Core principles',
    commitmentToPeople: 'A commitment to the people',

    // ---- News ----
    newsTitle: 'News & legislative updates',
    newsLede: 'Official announcements, press releases, and summaries of recent legislative activities from the Sangguniang Bayan. Informational only — news is not a local law.',
    latestUpdates: 'Latest updates',
    readFullReport: 'Read full report',
    categories: 'Categories',
    nextSession: 'Next session',
    viewFullCalendar: 'View full calendar',
    searchArchives: 'Search archives',
    toBeAnnounced: 'To be announced',
    photoGallery: 'Photo gallery',
    photoViewer: 'Announcement photo viewer',
    photo: 'photo',
    photos: 'photos',
    viewAnnouncementPhoto: 'View photo {number}{caption}',
    closePhotoViewer: 'Close photo viewer',
    previousPhoto: 'Previous photo',
    nextPhoto: 'Next photo',
    announcementPhoto: 'Announcement photo {number}',

    // ---- Shared states and labels ----
    // These were hardcoded across several pages, so a Tagalog reader saw a
    // half-translated page. Shared once, correct everywhere.
    loadingRecords: 'Loading records…',
    loadingResolutions: 'Loading resolutions…',
    loadingMembers: 'Loading members…',
    loadingCommittees: 'Loading committees…',
    loadingSessions: 'Loading sessions…',
    loadingDocument: 'Loading document…',
    loadingComments: 'Loading comments…',
    loadingUpdates: 'Loading updates…',
    loadingArticle: 'Loading article…',
    loadingCouncilMembers: 'Loading council members…',
    documentNotFound: 'Document not found.',
    articleNotFound: 'Article not found.',
    noResolutionsMatch: 'No resolutions found matching your criteria.',
    noUpdatesYet: 'No news or announcements are available at the moment.',
    noMembersYet: 'Member profiles are not available yet.',
    noCommentsYet: 'No public comments yet.',
    anonymousResident: 'Anonymous resident',
    commentsReviewedNotice: 'New comments appear as soon as the submission is accepted.',
    commentsLoadError: 'Failed to load comments. Please try again.',
    commentsTryAgain: 'You can try refreshing the page or check back later.',
    civicDataUnavailable: 'Live civic data is temporarily unavailable.',
    primarySponsor: 'Primary sponsor',
    publicComments: 'Public comments',
    legislativeProgress: 'Legislative progress',
    relatedDocuments: 'Related documents',
    publicHearings: 'Public hearings',
    announcements: 'Announcements',
    legislativeOffice: 'Legislative office',
    searchTerms: 'Search terms',
    breadcrumbHome: 'Home',
    searchAction: 'Search',

    // ---- Fallback copy for absent data ----
    // These appear when a record has no number, category, position or body.
    // They were hardcoded in the pages, so a Tagalog reader saw them in English
    // mid-sentence. Null Tagalog is preferred over an invented translation.
    unnumbered: 'Unnumbered',
    publicUpdate: 'Public update',
    regularSession: 'Regular session',
    sbMemberRole: 'Sangguniang Bayan member',
    sessionVenueFallback: 'Municipal Hall, Session Hall A',
    noOpenConsultations: 'No measures are currently open for comment.',
    loadingConsultations: 'Loading open consultations…',
    noRecordsPublished: 'No public records are available yet.',
    noSessionsScheduled: 'No sessions are currently scheduled.',
    noVotesRecorded: 'No votes recorded yet.',
    noCommitteesFound: 'No committees found.',
    noCommitteesMatch: 'No committees found matching “{search}”.',
    noSummaryAvailable: 'No summary available.',
    noSummaryAvailableDocument: 'No summary available for this document.',
    noAdditionalDetails: 'No additional details are available for this update.',
    loadingShort: 'Loading…',
    amendedLabel: 'Amended',
    amendedMeasureTitle: 'This measure has been amended by a newer version',
    amendedNoticeLead: 'This measure has been',
    amendedNoticeVerb: 'amended',
    amendedNoticeSuffix: 'and superseded by a newer version.',
    viewAmendedMeasure: 'View {number}',
    newerVersion: 'newer version',
    amendsNoticeLead: 'This measure',
    amendsNoticeVerb: 'amends',
    earlierOrdinance: 'an earlier ordinance',
    amendedMeasureTitleSuffix: ' — {title}.',

    // ---- Accessible names ----
    // aria-labels are read aloud by screen readers, so they are user-visible in
    // the most literal sense. They were hardcoded and invisible to the
    // translation checklist, which only counts catalogue keys.
    ariaFooterNav: 'Footer navigation',
    ariaBreadcrumb: 'Breadcrumb',
    ariaRecordsList: 'Records',
    ariaResolutionsList: 'Resolutions',
    ariaArchiveAtAGlance: 'Archive at a glance',
    // Interpolated: t('ariaViewDetailsFor', { title: doc.title }).
    ariaViewDetailsFor: 'View details for {title}',
    ariaDownloadPdfFor: 'Download PDF for {title}',
    skipToMainContent: 'Skip to main content',
    ariaMainNav: 'Main navigation',
    ariaBrandHome: 'B-LIS Home',
    ariaLegislativeTimeline: 'Legislative timeline',
    ariaFilterByTerm: 'Filter by term',
    ariaDocumentSections: 'Document sections',
    ariaDocumentTools: 'Document tools',
    ariaArchiveShortcuts: 'Archive shortcuts',
    ariaVoteOptions: 'Vote options',
    ariaSearchFilterRecords: 'Search and filter records',
    ariaExpandTermList: 'Expand term list',
    ariaCollapseTermList: 'Collapse term list',
    termsHeading: 'Terms',
    committeeMembersCrumb: 'Committee Members',
    ordinancesCrumb: 'Ordinances & Resolutions',
    sbMembersCrumb: 'SB Members',
    committeesLede: 'Committees are the engine rooms of the legislative process. They review proposed ordinances, conduct public hearings, and provide expert recommendations to the Sangguniang Bayan.',
    recordsArchiveLede: 'Access the complete archive of municipal ordinances and resolutions enacted by the Sangguniang Bayan.',
    resolutionsArchiveLede: 'Search and view the official resolutions passed by the Sangguniang Bayan.',
    documentDetailCrumb: 'Document detail',
    multipleSponsors: 'Multiple sponsors',
    featuredBulletin: 'Featured bulletin',
    participateInConsultation: 'Participate in Public Consultation',
    submitFeedbackHeading: 'Submit Public Feedback',
    optionalForConsultation: 'Optional for public consultations',
    // Shown when a document has no server-side status yet. Distinct from the
    // `publicConsultation` and `submitFeedback` labels, which are action verbs.
    inProgress: 'In progress',
    guestFormLede: 'Please fill out all required fields. Your ID is strictly for identity verification.',
    committeeMembersHeading: 'Committee Members',
    // `minutes` is unused by the footer: that link resolves through
    // `t('sessions')`. Kept out rather than duplicated.
    missionVisionTitle: 'Mission & Vision',
    sbMemberTag: 'SB Member',
    viceMayorRole: 'Vice Mayor',
    ariaSearchFilterResolutions: 'Search and filter resolutions',
    ariaDocumentType: 'Document type',
    termAllLabel: 'All terms',
    termLabel: 'Term',
    allShort: 'All',
    publicSentiment: 'Public sentiment —',
    participants: 'participants',
    currentTermLabel: 'Current',
    breadcrumbAbout: 'About',
    committeeMembersLabel: 'Members',

    // Field labels and short prompts. The trailing " *" is the required-field
    // marker rendered by the design system, so it stays in the copy rather than
    // being composed in JSX, keeping label strings atomic for translators.
    guestFullNameLabel: 'Full Name *',
    guestContactLabel: 'Contact Number *',
    guestContactPlaceholder: '09123456789',
    guestEmailLabel: 'Email Address *',
    guestEmailPlaceholder: 'name@example.com',
    guestEmailCodeLabel: 'Email verification code *',
    guestEmailCodePlaceholder: 'Enter 6-digit code',
    guestEmailSendCode: 'Send email code',
    guestEmailResend: 'Resend email code',
    guestEmailSending: 'Sending…',
    guestEmailVerifyCode: 'Verify email',
    guestEmailVerifying: 'Verifying…',
    guestEmailVerified: 'Email verified',
    guestEmailInvalid: 'Please enter a valid email address',
    guestEmailVerificationRequired: 'Verify your email before submitting',
    guestUseSmsOtp: 'Use SMS OTP instead',
    guestUseEmailVerification: 'Use email verification instead',
    guestEmailCodeSent: 'Verification code sent. Check your email.',
    guestEmailCodeSendFailed: 'Unable to send the email code',
    guestEmailVerifyFailed: 'Unable to verify this email code',
    guestOtpOptionalLabel: 'SMS OTP (optional)',
    guestOtpRequiredLabel: 'SMS verification code *',
    guestOtpPlaceholder: 'Enter code',
    guestOtpSend: 'Send OTP',
    guestOtpResend: 'Resend OTP',
    guestOtpSending: 'Sending…',
    guestOtpInvalid: 'Request and enter the 6-digit OTP sent to your phone',
    guestOtpContactInvalid: 'Please enter a valid 11-digit mobile number (09xxxxxxxxx)',
    guestOtpSent: 'OTP requested. Check your phone shortly.',
    guestOtpTestReady: 'Development OTP ready; no SMS was sent.',
    guestOtpSendFailed: 'Unable to send OTP',
    guestOtpDevelopmentHint: 'Development only · No SMS sent · Test OTP:',
    guestBarangayLabel: 'Barangay',
    guestBarangayPrompt: 'Select Barangay',
    guestCommentLabel: 'Your Feedback / Remarks',
    guestValidIdLabel: 'Valid ID Image *',
    searchKeywordsPlaceholder: 'Keywords',
    filterCommitteeLabel: 'Committee',
    filterStatusLabel: 'Status',

    // Vote chart series names. Must stay aligned with the API tally keys
    // Agree/Neutral/Disagree, which remain English by contract.
    voteAgree: 'Agree',
    voteNeutral: 'Neutral',
    voteDisagree: 'Disagree',

    // Icon-and-label buttons. The label used to sit as a bare JSX text node after
    // a self-closing icon tag, which is invisible to a `>text<` match anchored on
    // a letter, so these strings were never translatable.
    followUsFacebook: 'Follow us on Facebook',
    viewMinutes: 'View minutes',
    viewPublicComments: 'View public comments',
    sessionHall: 'Session hall',

    // One/many pair rather than an `+s` suffix. Tagalog marks plurality with
    // `mga`, which an English-style suffix cannot express.
    approvedCommentOne: 'approved comment',
    approvedCommentMany: 'approved comments',

    // Long-form body copy that was hardcoded in JSX and therefore untranslatable.
    sealBodyP1:
      "The Official Seal of the Municipality of Bongabong represents the authority and identity of our local government. It symbolizes our rich cultural heritage, our agricultural roots, and our vision for a progressive future.",
    sealBodyP2:
      "Used in all official documents, resolutions, and ordinances enacted by the Sangguniang Bayan, the seal guarantees the authenticity and legal force of the council's legislative acts.",
    legislativeBodyP1:
      'The Sangguniang Bayan (SB) is the local legislative body of the Municipality of Bongabong. It is composed of the Municipal Vice Mayor as the presiding officer, eight regular Sanggunian members, the President of the Association of Barangay Captains (ABC), and the President of the Sangguniang Kabataan (SK) Federation.',
    legislativeBodyP2:
      'Their primary mandate is to enact ordinances, approve resolutions, and appropriate funds for the general welfare of the municipality and its inhabitants.',
    // Always-Tagalog side-by-side pairing. Identical values in both blocks by
    // design: this column is a translation quote, not a language-switched prose.
    legislativeBodyQuote1:
      'Ang Sangguniang Bayan (SB) ay ang lokal na tagapagbatas ng Munisipalidad ng Bongabong. Ito ay binubuo ng Municipal Vice Mayor bilang presiding officer, walong regular na miyembro, Pangulo ng ABC, at Pangulo ng SK Federation.',
    legislativeBodyQuote2:
      'Ang pangunahing tungkulin nila ay gumawa ng mga ordinansa, magpasa ng mga resolusyon, at maglaan ng pondo para sa pangkalahatang kapakanan ng munisipalidad at ng mga mamamayan nito.',
    presidingOfficerBio:
      'As Presiding Officer of the Sangguniang Bayan, the Vice Mayor ensures that legislative sessions are conducted with order, transparency, and a steadfast commitment to the welfare of the Bongabong community.',
    visionMissionLede:
      'The guiding principles and long-term aspirations that direct the legislative priorities and public service commitments of the Municipality of Bongabong.',
    municipalVisionStatement:
      'To forge a resilient, transparent, and progressively sustainable Bongabong, where legislative rigor meets the profound needs of every citizen, ensuring enduring prosperity and justice for future generations.',
    commitmentBody:
      'We, the Sangguniang Bayan of Bongabong, hereby affirm our dedication to these ideals. Through rigorous debate, careful study, and steadfast public service, we commit to realizing this vision for our municipality.',
    guestFeedbackPending:
      'Your vote and any comment are published now. Your name, contact details, email, and ID stay private to authorized staff.',
    guestReceiptHeading: 'Save this private reference',
    guestReceiptInstructions: 'Keep this code to check publication status or appeal a later moderation decision. It is shown only to you.',
    guestCheckStatus: 'Check submission status',
    guestEligibilityStatus: 'Participation eligibility',
    guestCommentStatus: 'Comment status',
    guestDecisionReason: 'Decision reason',
    guestAppealReason: 'Why are you appealing? (at least 8 characters)',
    guestAppealSending: 'Submitting appeal…',
    guestSubmitAppeal: 'Submit appeal',
    personalInformationHeading: 'Personal Information',
    yourFeedbackHeading: 'Your Feedback',
    yourVoteLabel: 'Your Vote',
    dataPrivacyConsent:
      'I consent to the collection and processing of my personal data (Name, Contact Number, Email, Valid ID) strictly for identity verification in accordance with the Data Privacy Act of 2012. I understand that my ID will be automatically deleted after the consultation period.',
    committeesSearchPlaceholder: 'Search by committee or member name',
    guestFeedbackPlaceholder: 'Share your thoughts on this document',
    guestNamePlaceholder: 'Juan Dela Cruz',
    sessionNoLinkedDocs: 'No specific ordinances or resolutions are linked to this session.',
    // 'Members of the Sangguniang Bayan of Bongabong' is a proper noun caption
    // for a photograph. Kept as a key so the caption and alt stay in step, but
    // the Tagalog is left null rather than invented.
    councilGroupCaption: 'Members of the Sangguniang Bayan of Bongabong',
    sangguniangBayanSignature: 'The Sangguniang Bayan',
    recordsPageTitle: 'Legislative Documents & Record Search',
    resolutionsPageTitle: 'Municipal Resolutions',
    guestFeedbackSubmittedTitle: 'Feedback Submitted Successfully',
  },
  tl: {
    home: 'Home',
    ordinanceNav: 'Ordinansa',
    ordinances: 'Mga Ordinansa',
    resolutions: 'Mga Resolusyon',
    sessions: 'Mga Sesyon',
    committees: 'Mga Komite',
    members: 'Mga Miyembro ng SB',
    newsNav: 'Balita',
    about: 'Tungkol Dito',
    portalSubtitle: 'Opisyal na Portal ng Lokal na Lehislasyon',
    overview: 'Buod',
    sessionHistory: 'Kasaysayan ng Sesyon',
    publicConsultation: 'Pampublikong Konsultasyon (Aktibo)',
    submitFeedback: 'Magbigay ng Komento',
    submittingFeedback: 'Ipinapasaad…',
    backToArchive: 'Bumalik sa Arkibo',
    dateFiled: 'Petsa ng Pagkakahain',
    committee: 'Komite',
    effectivityDate: 'Petsa ng Epektibidad',
    plainLanguageSummary: 'Simpleng Buod',
    noSummary: 'Wala pang ibinigay na simpleng buod.',
    documents: 'Mga Dokumento',
    viewPdf: 'Tingnan ang PDF',
    downloadCopy: 'I-download',

    // Shell
    officialService: 'Opisyal na serbisyo publiko',
    officialUpdates: 'Mga opisyal na balita',
    openParticipation: 'Maligayang pakikilahok',
    sbFullName: 'Sangguniang Bayan ng Bongabong',
    search: 'Maghanap',
    openNavigation: 'Buksan ang nabigasyon',
    closeNavigation: 'Isara ang nabigasyon',
    navigate: 'Nabigasyon',
    exploreRecord: 'Tuklasin ang tala',
    whatsNew: 'Bago',
    footerTagline: 'Ang opisyal na tala ng Bongabong',
    exploreTheRecord: 'Tuklasin ang tala',
    publicInfoDesk: 'Desk ng pampublikong impormasyon',
    contactMe: 'Makipag-ugnayan', // DRAFT — needs municipal review; left as key for visibility
    switchLanguage: 'Palitan ang wika',

    // Home bands
    officialPublicRecord: 'Opisyal na tala publiko',
    heroHeadline: 'Nagsisimula ang mabuting pamamahala sa pag-alam kung ano ang nangyari.',
    heroLede: 'Sundan ang mga desisyong humuubog sa inyong mga kalye, paaralan, negosyo, at kinabukasan. Pagkatapos, gawing mas madaling marinig ang inyong tinig.',
    heroByline: 'Opisyal na tala na inilathala ng Sangguniang Bayan ng Bongabong',
    approvedOrdinances: 'Aprubadong ordinansa',
    approvedResolutions: 'Aprubadong resolusyon',
    ordinancesRecorded: 'Naitalang ordinansa',
    resolutionsRecorded: 'Naitalang resolusyon',
    openForCommentCount: 'Bukas para sa komento',
    maximumPhotoSize: 'Pinakamalaking sukat ng larawan: 25 MB.', // DRAFT — needs municipal review.
    loadingContent: 'Naglo-load ng nilalaman…',
    theCouncil: 'Ang konseho',
    councilHeading: 'Ang konseho ng Bongabong',
    councilBlurb: 'Ang katawan na nag-aaral, nagdebate, at kumikilos sa mga panukalang lokal.',
    seeFullMemberProfiles: 'Tingnan ang buong listahan ng miyembro',
    newsAndUpdates: 'Mga balita at update',
    newsBlurb: 'Ang nangyayari sa Bongabong',
    informationalOnly: 'Impormasyon lamang. Ang balita ay hindi batas ng bayan.',
    viewAllUpdates: 'Tingnan lahat ng balita',
    takePart: 'Makilahok',
    openForComment: 'Bukas para sa komento',
    openBlurb: 'Basahin ang hinuusap at mag-iwan ng beripikadong komento bago ang pampublikong pagdinig.',
    seeOpenConsultations: 'Tingnan ang mga bukas na konsultasyon',
    decisions: 'Mga pasya',
    latestRecords: 'Pinakabagong tala',
    recordsBlurb: 'Ang mga pinapasya ngayon.',
    viewFullArchive: 'Tingnan ang buong arkibo',
    publicCalendar: 'Pampublikong kalendaryo',
    sessionsBlurb: 'Nakalalathag sa minutes ang mga sesyon, pagbasa, at boto.',
    seePublicCalendar: 'Tingnan ang pampublikong kalendaryo',
    searchArchive: 'Maghanap sa pampublikong arkibo',
    findRecord: 'Hanapin ang isang tala sa ilang salita.',
    findRecordBlurb: 'Maghanap ayon sa numero ng ordinansa, pamagatawag, komite, o keyword.',
    searchPlaceholder: 'Pamagatawag, numero, komite, o keyword',
    liveDataUnavailable: 'Pansamantalang hindi available ang live na datos ng bayan.',
    liveDataBlurb: 'Maring ilang datos sa ibaba. Posibleng hindi tumatakbo ang pampublikong API.',

    // Awaiting municipal translation. null means "render the English string".
    searchRecords: 'Maghanap ng tala',
    searchRecordsPlaceholder: 'Pamagatawag, numero, komite, o tagapagsulong',
    committeeLabel: 'Komite',
    statusLabel: 'Estado',
    allCommittees: 'Lahat ng komite',
    allStatuses: 'Lahat ng estado',
    viewDetails: 'Tingnan ang detalye',
    downloadPdf: 'I-download ang PDF',
    noRecordsMatch: 'Walang dokumento na tumutugma sa iyong pagtingin.',
    pageOf: 'Pahina {current} ng {total}',
    previous: 'Nakaraan',
    next: 'Susunod',

    sessionsTitle: 'Mga Sesyon at Minutes ng SB',
    sessionsLede: 'Tingnan ang tala ng karaniwang at espesyal na sesyon ng Sangguniang Bayan, kabilang ang pangunahing usapin na tinalakay.',
    downloadMinutes: 'I-download ang minutes',
    minutesNotPublished: 'Hindi pa nailathala ang minutes',
    noSessions: 'Wala pang naitalang sesyon.',
    keyItemsDiscussed: 'Pangunahing usapin na tinalakay',

    membersTitle: 'Ang Sangguniang Bayan',
    presidingOfficer: 'Tagapangulo',
    municipalViceMayor: 'Puno ng Bayan',
    sbMembers: 'Miyembro ng Sangguniang Bayan',
    chairmanship: 'Pagpupunong',
    committeeAssignments: 'Mga atas sa komite',
    committeeChairRole: 'Tagapangulo', // DRAFT — needs municipal review.
    committeeViceChairRole: 'Pangalawang tagapangulo', // DRAFT — needs municipal review.
    committeeMemberRole: 'Miyembro',
    viewAllCommitteeAssignments: 'Tingnan ang lahat ng {count} atas sa komite', // DRAFT — needs municipal review.
    readFullBiography: 'Basahin ang buong talambuhay',
    hideFullBiography: 'Itago ang buong talambuhay',
    termOfService: 'Panahon ng paglilingkod',
    contactOffice: 'Tanggapan ng kontak',
    noProfiles: 'Walang nahanap na profile ng miyembro.',

    committeesTitle: 'Mga Komite ng Batas',
    searchDirectory: 'Maghanap sa direktoryo',
    chairperson: 'Tagapangulo',
    viceChairperson: 'Pangalawang Tagapangulo',
    standingCommittee: 'Permanenteng komite',
    toBeDesignated: 'Itatalaga',

    aboutTitle: 'Tungkol sa Sangguniang Bayan',
    aboutLede: 'Tungkol sa Sangguniang Bayan ng Bongabong.',
    officialSeal: 'Ang opisyal na selye',
    legislativeBody: 'Ang katawan ng batas',
    legislativeProcess: 'Ang proseso ng paggawa ng batas',
    howMeasureBecomesLaw: 'Paano natutong na ordinansa ang isang panukala.',
    firstReadingTitle: 'Unang pagbasa',
    firstReadingDesc: 'Binabasa ang panukala ayon sa pamagatawag at ipinapasa sa angkop na komite para pag-aralan.',
    committeeHearingTitle: 'Pagdinig ng komite at pampublikong konsultasyon',
    committeeHearingDesc: 'Nag-uusap ang komite at nagdidineosil. Para sa mga ordinansa, may pampublikong konsultasyon.',
    secondThirdReadingTitle: 'Pangalawa at pangatlong pagbasa',
    secondThirdReadingDesc: 'Iniuusap at binoboto ng buong konseho ang panukala.',
    approvalTitle: 'Pag-apruba',
    approvalDesc: 'Kung maapruba, ipinapasa ito sa Punong Alkalde para sa lagdaan at pag-apruba.',
    coreValueIntegrity: 'Katapatan',
    coreValueIntegrityDesc: 'Matatag na pagsunod sa moral at etikal na tuntunin sa serbisyo publiko.',
    coreValueTransparency: 'Kadalubhasaan',
    coreValueTransparencyDesc: 'Bukas at abot-hang proseso ng pamamahalaan na nagpapakatiwalaan sa mga mamamayan.',
    coreValueResilience: 'Katatagan',
    coreValueResilienceDesc: 'Makasulong pananaw sa batas upang makapagtayo ng komunidad na kayang harapin ang mga hamon sa hinaharap.',
    coreValueEquity: 'Katarungan',
    coreValueEquityDesc: 'Tinitiyak ang pantay at walang kinikilingan na bahagi ng mga mapagkukunan at oportunidad.',
    missionPoint1: 'Magpasa ng mga ordinansang tumutugon at inklusibo na nagpampromosi sa kabuhayan at katarungang panlipunan.',
    missionPoint2: 'Magtatag ng kawalang-korupsyon at accountability sa lahat ng bahagi ng lokal na pamamahalaan.',
    missionPoint3: 'Pagprotektahan ang aming mga likas na yaman sa pamamagitan ng patakarang pangkalikasan.',
    missionPoint4: 'Palakasin ang pakikilahok ng mamamayan sa proseso ng paggawa ng batas, pagsasara ng agwat sa pagitan ng tao at institusyon.',
    firstReading: 'Unang pagbasa',
    committeeHearing: 'Pagdinig ng komite at pampublikong konsultasyon',
    secondThirdReading: 'Pangalawa at pangatlong pagbasa',
    approval: 'Pag-apruba',
    contactUs: 'Makipag-ugnayan',

    visionMissionTitle: 'Bisyon, misyon, at pangunahing halaga ng institusyon',
    municipalVision: 'Bisyon ng munisipyo',
    strategicMission: 'Misyon na estratehiko',
    corePrinciples: 'Mga pangunahing tuntunin',
    commitmentToPeople: 'Pangako sa mga mamamayan',

    newsTitle: 'Mga balita at update sa legislasyon',
    newsLede: 'Mga opisyal na anunsyo, balita, at buod ng kamakailang aktibidad ng Sangguniang Bayan.',
    latestUpdates: 'Pinakabagong balita',
    readFullReport: 'Basahin ang buong ulat',
    categories: 'Mga kategorya',
    nextSession: 'Susunod na sesyon',
    viewFullCalendar: 'Tingnan ang buong kalendaryo',
    searchArchives: 'Maghanap sa mga arkibo',
    toBeAnnounced: 'Ipinapahiwagay pa',
    photoGallery: 'Mga larawan',
    photoViewer: 'Tagatingin ng larawan ng anunsyo',
    photo: 'larawan',
    photos: 'mga larawan',
    viewAnnouncementPhoto: 'Tingnan ang larawan {number}{caption}',
    closePhotoViewer: 'Isara ang tagatingin ng larawan',
    previousPhoto: 'Naunang larawan',
    nextPhoto: 'Susunod na larawan',
    announcementPhoto: 'Larawan ng anunsyo {number}',

    // Shared states. Loading/empty copy is drafted; anything describing a
    // process or a document type is left null for review.
    loadingRecords: 'Naglo-load ng mga tala…',
    loadingResolutions: 'Naglo-load ng mga resolusyon…',
    loadingMembers: 'Naglo-load ng mga kasapi…',
    loadingCommittees: 'Naglo-load ng mga komite…',
    loadingSessions: 'Naglo-load ng mga sesyon…',
    loadingDocument: 'Naglo-load ng dokumento…',
    loadingComments: 'Naglo-load ng mga komento…',
    loadingUpdates: 'Naglo-load ng mga update…',
    loadingArticle: 'Naglo-load ng artikulo…',
    loadingCouncilMembers: 'Naglo-load ng mga kasapi ng konseho…',
    documentNotFound: 'Hindi natagpuan ang dokumento.',
    articleNotFound: 'Hindi natagpuan ang artikulo.',
    noResolutionsMatch: 'Walang resolusyon na tumutugma sa iyong pagtingin.',
    noUpdatesYet: 'Wala pang available na balita o anunsyo sa ngayon.',
    noMembersYet: 'Wala pang available na profile ng kasapi.',
    noCommentsYet: 'Wala pang pampublikong komento.',
    anonymousResident: 'Hindi nagpapakilalang residente',
    commentsReviewedNotice: 'Agad na lumalabas ang mga bagong komento kapag natanggap ang submission.',
    commentsLoadError: 'Hindi makalading ng mga komento. Pakisubukang muli.',
    commentsTryAgain: 'Maaari mong subukan na i-refresh ang pahina o maghintay ng ilang sandali.',

    // Fallback copy for absent data. Left null where a reviewer must decide —
    // an invented Tagalog rendering of an official record field would
    // misrepresent the municipality's voice.
    unnumbered: 'Walang numero',
    publicUpdate: 'Pampublikong update',
    regularSession: 'Karaniwang sesyon',
    sbMemberRole: 'Kasapi ng SB', // official role title; needs review
    sessionVenueFallback: 'Sangguniang Bayan Hall', // venue proper noun; needs review
    noOpenConsultations: 'Wala pang hakbang na tala na bukas para sa puna.',
    loadingConsultations: 'Naglo-load ng mga bukas na konsultasyon…',
    noRecordsPublished: 'Wala pang available na pampublikong tala.',
    noSessionsScheduled: 'Wala pang nakatakdang sesyon.',
    noVotesRecorded: 'Wala pang naitalang boto.',
    noCommitteesFound: 'Wala pang nahanap na komite.',
    noCommitteesMatch: 'Wala pang komiteng tumutugma sa “{search}”.',
    noSummaryAvailable: 'Walang buod na available.',
    noSummaryAvailableDocument: 'Walang buod na available para sa dokumentong ito.',
    noAdditionalDetails: 'Walang karagdagang detalyeng available para sa update na ito.',
    loadingShort: 'Naglo-load…',
    amendedLabel: 'Sinusugan',
    amendedMeasureTitle: 'May mas bagong bersyon na nagsususog sa panukalang ito',
    amendedNoticeLead: 'Ang panukalang ito ay',
    amendedNoticeVerb: 'sinusugan',
    amendedNoticeSuffix: 'at pinalitan ng mas bagong bersyon.',
    viewAmendedMeasure: 'Tingnan ang {number}',
    newerVersion: 'mas bagong bersyon',
    amendsNoticeLead: 'Ang panukalang ito ay',
    amendsNoticeVerb: 'nag-aamyenda sa',
    earlierOrdinance: 'naunang ordinansa',
    amendedMeasureTitleSuffix: ' — {title}.',
    civicDataUnavailable: 'Pansamantalang hindi available ang live na datos ng pamahalaan.',
    primarySponsor: 'Pangunahing tagapagsulong', // official record field — needs review
    publicComments: 'Pampublikong komento',
    legislativeProgress: 'Antas ng pagpiliwatag',
    relatedDocuments: 'Kaugnay na dokumento',
    publicHearings: 'Pampublikong pagdinig',
    announcements: 'Mga anunsyo',
    legislativeOffice: 'Tanggapan ng batas',
    searchTerms: 'Mga termino sa paghahanap',
    breadcrumbHome: 'Pangunahing pahina',
    searchAction: 'Maghanap',

    // Accessible names. Screen readers read these aloud, so they are as
    // user-visible as body copy. Left null where a reviewer must decide.
    ariaFooterNav: 'Nabigasyon ng paanan',
    ariaBreadcrumb: 'Breadcrumb',
    ariaRecordsList: 'Mga tala',
    ariaResolutionsList: 'Mga resolusyon',
    ariaArchiveAtAGlance: 'Buod ng arkibo',
    ariaViewDetailsFor: 'Tingnan ang detalye ng {title}',
    ariaDownloadPdfFor: 'I-download ang PDF ng {title}',
    skipToMainContent: 'Lumaktaw sa pangunahing nilalaman',
    ariaMainNav: 'Pangunahing nabigasyon',
    ariaBrandHome: 'B-LIS Home',
    ariaLegislativeTimeline: 'Timeline ng pagpiliwatag',
    ariaFilterByTerm: 'Salain ayon sa termino',
    ariaDocumentSections: 'Mga bahagi ng dokumento',
    ariaDocumentTools: 'Mga kasangkapan ng dokumento',
    ariaArchiveShortcuts: 'Mga madaling daan ng arkibo',
    ariaVoteOptions: 'Mga pagpipilian ng boto',
    ariaSearchFilterRecords: 'Maghanap at salain ang mga tala',
    // Tagalog supplied for mechanical/short labels where the translation is
    // unambiguous. Long-form prose keys stay null so the gap is visible in the
    // checklist and a human reviewer fills them in.
    ariaExpandTermList: 'Palawakin ang listahan ng mga termino',
    ariaCollapseTermList: 'Tiklupin ang listahan ng mga termino',
    termsHeading: 'Mga Termino',
    documentDetailCrumb: 'Detalye ng dokumento',
    multipleSponsors: 'Maraming tagapagsulong',
    featuredBulletin: 'Pambulating bulletin',
    sbMemberTag: 'SB Member',
    viceMayorRole: 'Pangalawang Alkalde',
    missionVisionTitle: 'Misyon & Bisyon',
    committeeMembersCrumb: 'Mga Miyembro ng Komite',
    sbMembersCrumb: 'Mga Miyembro ng SB',
    committeesLede: 'Ang mga komite ang makina ng proseso ng legislatibon. Sinasuri nila ang mga panukalang ordinansa, nagsasagawa ng mga hearing, at naghahalagbang baybayin bago ang pagpapasya.',
    recordsArchiveLede: 'I-access ang buong arkibo ng mga ordinansa at resolusyon ng munisipyo na ipinatutupad ng Sangguniang Bayan.',
    resolutionsArchiveLede: 'Maghanap at tingnan ang mga opisyal na resolusyon na ipinapasa ng Sangguniang Bayan.',
    ordinancesCrumb: 'Mga Ordinansa at Resolusyon',
    committeeMembersHeading: 'Mga Miyembro ng Komite',
    participateInConsultation: 'Makilahok sa Pampublikong Konsultasyon',
    submitFeedbackHeading: 'Magpasa ng Pampublikong Feedback',
    optionalForConsultation: 'Opsyonal para sa mga pampublikong konsultasyon',
    inProgress: 'Isinasagawa',
    guestFormLede: 'Puno ang lahat ng kinakailangang field. Ang iyong ID ay para lamang sa beripikasyon ng pagkakakilanlan.',
    ariaSearchFilterResolutions: 'Maghanap at salain ang mga resolusyon',
    ariaDocumentType: 'Uri ng dokumento',
    termAllLabel: 'Lahat ng termino',
    termLabel: 'Termino',
    allShort: 'Lahat',
    publicSentiment: 'Pampublikong damdamin —',
    participants: 'na kalahok',
    currentTermLabel: 'Kasalukuyan',
    breadcrumbAbout: 'Tungkol Dito',
    committeeMembersLabel: 'Mga miyembro',

    guestFullNameLabel: 'Buong Pangalan *',
    guestContactLabel: 'Numero ng Contacto *',
    guestContactPlaceholder: '09123456789',
    guestEmailLabel: 'Email Address *',
    guestEmailPlaceholder: 'pangalan@example.com',
    guestEmailCodeLabel: 'Code ng beripikasyon sa email *',
    guestEmailCodePlaceholder: 'Ilagay ang 6-digit na code',
    guestEmailSendCode: 'Ipadala ang code sa email',
    guestEmailResend: 'Ipadala muli ang code',
    guestEmailSending: 'Ipinapadala…',
    guestEmailVerifyCode: 'Beripikahin ang email',
    guestEmailVerifying: 'Bineberipika…',
    guestEmailVerified: 'Beripikado na ang email',
    guestEmailInvalid: 'Maglagay ng wastong email address',
    guestEmailVerificationRequired: 'Beripikahin ang iyong email bago magsumite',
    guestUseSmsOtp: 'Gumamit ng SMS OTP',
    guestUseEmailVerification: 'Gumamit ng beripikasyon sa email',
    guestEmailCodeSent: 'Naipadala na ang code. Tingnan ang iyong email.',
    guestEmailCodeSendFailed: 'Hindi maipadala ang code sa email',
    guestEmailVerifyFailed: 'Hindi maberipika ang code na ito',
    guestOtpOptionalLabel: 'SMS OTP (opsyonal)',
    guestOtpRequiredLabel: 'SMS verification code *',
    guestOtpPlaceholder: 'Ilagay ang code',
    guestOtpSend: 'Ipadala ang OTP',
    guestOtpResend: 'Ipadala muli ang OTP',
    guestOtpSending: 'Ipinapadala…',
    guestOtpInvalid: 'Humiling at ilagay ang 6-digit OTP na ipinadala sa iyong telepono',
    guestOtpContactInvalid: 'Maglagay ng wastong 11-digit na mobile number (09xxxxxxxxx)',
    guestOtpSent: 'Hiniling ang OTP. Tingnan ang iyong telepono maya-maya.',
    guestOtpTestReady: 'Development OTP handa na; walang SMS na ipinadala.',
    guestOtpSendFailed: 'Hindi maipadala ang OTP',
    guestOtpDevelopmentHint: 'Pang-development lamang · Walang SMS na ipinadala · Test OTP:',
    guestBarangayLabel: 'Barangay',
    guestBarangayPrompt: 'Pumili ng Barangay',
    guestCommentLabel: 'Iyong Feedback / Puna',
    guestValidIdLabel: 'Larawan ng Valid ID *',
    searchKeywordsPlaceholder: 'Mga salitang susi',
    filterCommitteeLabel: 'Komite',
    filterStatusLabel: 'Katayuan',

    voteAgree: 'Sumasang-ayon',
    voteNeutral: 'Neutral',
    voteDisagree: 'Hindi Sumasang-ayon',

    followUsFacebook: 'Sundan kami sa Facebook',
    viewMinutes: 'Tingnan ang Minutes',
    viewPublicComments: 'Tingnan ang mga pampublikong komento',
    sessionHall: 'Session hall',

    approvedCommentOne: 'apradadong komento',
    approvedCommentMany: 'mga apradadong komento',

    sealBodyP1:
      'Ang Opisyal na Selye ng Munisipalidad ng Bongabong ay kumakatawan sa awtoridad at pagkakakilanlan ng aming lokal na pamamahalaan. Siniwala nito ang aming mayamang kultural na pamana, aming pinagmumulan ng sakahan, at ang aming pangarap sa isang maunlad na kinabukasan.',
    sealBodyP2:
      'Ginagamit sa lahat ng opisyal na dokumento, resolusyon, at ordinansang ipinatutupad ng Sangguniang Bayan, ang selye ay nagbibigay ng tunay at legal na bisa sa mga legislatibong acts ng konseho.',
    legislativeBodyP1:
      'Ang Sangguniang Bayan (SB) ay ang lokal na tagapagbatas ng Munisipalidad ng Bongabong. Binubuo ito ng Punong Alkalde bilang tagapangulo, walong regular na miyembro, Pangulo ng Association of Barangay Captains (ABC), at Pangulo ng Sangguniang Kabataan (SK) Federation.',
    legislativeBodyP2:
      'Ang pangunahing tungkulin nila ay gumawa ng mga ordinansa, magpasa ng mga resolusyon, at maglaan ng pondo para sa pangkalahatang kapakanan ng munisipalidad at ng mga mamamayan nito.',
    legislativeBodyQuote1:
      'Ang Sangguniang Bayan (SB) ay ang lokal na tagapagbatas ng Munisipalidad ng Bongabong. Ito ay binubuo ng Municipal Vice Mayor bilang presiding officer, walong regular na miyembro, Pangulo ng ABC, at Pangulo ng SK Federation.',
    legislativeBodyQuote2:
      'Ang pangunahing tungkulin nila ay gumawa ng mga ordinansa, magpasa ng mga resolusyon, at maglaan ng pondo para sa pangkalahatang kapakanan ng munisipalidad at ng mga mamamayan nito.',
    presidingOfficerBio:
      'Bilang Tagapangulo ng Sangguniang Bayan, ang Punong Alkalde ay nagsusulong na ang mga legislatibong sesyon ay isinasagawa nang may kaayusan, kalinawan, at matibay na pagtatalaga sa kapakanan ng komunidad ng Bongabong.',
    visionMissionLede:
      'Ang mga pangunahing tuntunin at pangmatagalang aspiration na nagtuturo sa mga prayoridad ng batas at pangako sa serbisyo publiko ng Munisipalidad ng Bongabong.',
    municipalVisionStatement:
      'Upang makabuo ng matatag, transparent, at unti-unting sustainable na Bongabong, kung saan ang katumpakan ng batas ay nahaharap sa malalim na pangangailangan ng bawat mamamayan, na naglalayong magkaroon ng matatag na kaunlaran at katarungan para sa mga susunong henerasyon.',
    commitmentBody:
      'Kami, ang Sangguniang Bayan ng Bongabong, sa pakikipag-ugnayan ay kinukumpirma ang aming dedication sa mga ideyang ito. Sa pamamagitan ng mahigpit na talakayan, maingat na pag-aaral, at matatag na serbisyo publiko, nakalaan kaming ipatupad ang bisyon na ito para sa aming munisipyo.',
    guestFeedbackPending:
      'Agad nang inilathala ang iyong boto at komento. Mananatiling pribado sa mga awtorisadong kawani ang iyong pangalan, mga detalye sa pakikipag-ugnayan, email, at ID.',
    guestReceiptHeading: 'Itago ang pribadong reference code na ito',
    guestReceiptInstructions: 'Itago ang code upang tingnan ang katayuan ng paglalathala o umapela sa susunod na pasya sa moderasyon. Ikaw lamang ang makakakita nito.',
    guestCheckStatus: 'Tingnan ang katayuan ng submission',
    guestEligibilityStatus: 'Pagiging karapat-dapat lumahok',
    guestCommentStatus: 'Katayuan ng komento',
    guestDecisionReason: 'Dahilan ng pasya',
    guestAppealReason: 'Bakit ka umaapela? (hindi bababa sa 8 character)',
    guestAppealSending: 'Ipinapadala ang apela…',
    guestSubmitAppeal: 'Ipadala ang apela',
    personalInformationHeading: 'Personal na Impormasyon',
    yourFeedbackHeading: 'Ang Iyong Feedback',
    yourVoteLabel: 'Ang Iyong Boto',
    dataPrivacyConsent:
      'Pumapay ako sa pagkolekta at pagproseso ng aking personal na datos (Pangalan, Numero ng Kontak, Email, Valid ID) para lamang sa beripikasyon ng pagkakakilanlan ayon sa Data Privacy Act ng 2012. Naiintindihan ko na awtomatikong tatanggalin ang aking ID pagkatapos ng panahon ng konsultasyon.',
    committeesSearchPlaceholder: 'Maghanap ayon sa komite o pangalan ng kasapi',
    guestFeedbackPlaceholder: 'Ibahagi ang iyong saloobin tungkol sa dokumentong ito',
    guestNamePlaceholder: 'Juan Dela Cruz',
    sessionNoLinkedDocs: 'Walang tiyak na ordinansa o resolusyon na nakatali sa sesyong ito.',
    councilGroupCaption: 'Mga miyembro ng Sangguniang Bayan ng Bongabong', // proper-noun photo caption; needs review
    sangguniangBayanSignature: 'Ang Sangguniang Bayan', // official body name; needs review
    recordsPageTitle: 'Mga Dokumento ng Batas at Paghahanap ng Tala',
    resolutionsPageTitle: 'Mga Resolusyon ng Munisipyo',
    guestFeedbackSubmittedTitle: 'Matagumpay na ipinadala ang feedback', // needs review
  },
};

/**
 * Keys whose Tagalog is still missing or only a draft. Surfaced so the
 * translation gap is a measurable number rather than an assumption.
 */
export function LANG_STATUS() {
  const en = translations.en;
  const tl = translations.tl;
  const pending = Object.keys(en).filter((key) => tl[key] == null);
  const drafted = Object.keys(en).filter((key) => tl[key] != null);
  return { total: Object.keys(en).length, pending, draftedCount: drafted.length };
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  // A null tl value means "not translated yet", so the English string is
  // returned rather than a machine-translated guess. `interpolate` fills
  // placeholders such as {current} / {total}.
  const t = (key, vars) => {
    const value = translations[language][key] ?? translations.en[key] ?? key;
    if (!vars) return value;
    return Object.entries(vars).reduce(
      (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
      value
    );
  };

  // Keep the document language in step with the toggle so screen readers
  // pronounce the active script correctly.
  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const toggle = () => setLanguage((current) => (current === 'en' ? 'tl' : 'en'));

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
