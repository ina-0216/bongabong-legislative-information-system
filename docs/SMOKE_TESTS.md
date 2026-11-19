# iBOSys Smoke Tests (10 critical paths)

Run these after each deploy. Mark pass/fail.

1. Login → Dashboard → Propose Ordinance → Advance status → Generate PDF
2. Public: Search → Document detail → Submit consultation (OTP + ID)
3. Secretary: Review pending consultation → Approve → Tally updates
4. Admin: Create user → Reset password → Deactivate
5. PDF: Ordinance, Session Minutes, Committee/Annual/Participation reports
6. Encoding: Rich text, add/remove sections, required-field validation, draft restore
7. Consultation: OTP flow, sentiment override, bulk approve/reject
8. Public portal: Search, committee/status/term filters, document view, EN/TL toggle
9. Dashboard: Filters, pagination, charts load
10. Auth: Login, logout, forgot/reset password email link
