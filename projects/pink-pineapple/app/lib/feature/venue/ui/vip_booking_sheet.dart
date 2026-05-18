import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';
import 'package:pineapple/core/global_widgets/app_snackbar.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/feature/venue/model/venue_model.dart';
import 'package:pineapple/feature/venue/ui/floor_plan_viewer.dart';
import 'package:url_launcher/url_launcher.dart';

/// Pink Pineapple's WhatsApp Business number. Used to construct the
/// `wa.me/PHONE` deep link when a user submits a VIP table request.
///
/// TODO(rocky): set this once Troy has registered the Pink Pineapple
/// business account at business.whatsapp.com. International format
/// without the leading '+' (e.g. '62812...').
const String kPpWhatsappNumber = '0000000000';

/// Shows the VIP table booking bottom sheet. Auto-fills the customer's
/// profile data, collects event-specific details, POSTs to the backend
/// for attribution tracking, then opens WhatsApp with a pre-filled
/// structured message to Rowan.
Future<void> showVipBookingSheet({
  required BuildContext context,
  required VenueModel venue,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) => _VipBookingSheet(venue: venue),
  );
}

class _VipBookingSheet extends StatefulWidget {
  const _VipBookingSheet({required this.venue});

  final VenueModel venue;

  @override
  State<_VipBookingSheet> createState() => _VipBookingSheetState();
}

class _VipBookingSheetState extends State<_VipBookingSheet> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _instagram = TextEditingController();
  final _partySize = TextEditingController();
  final _area = TextEditingController();
  final _minPrice = TextEditingController();
  DateTime? _eventDate;
  TimeOfDay? _arrivalTime;
  String _deposit = 'FIFTY_PERCENT'; // FIFTY_PERCENT | FULL
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _prefillFromProfile();
  }

  void _prefillFromProfile() {
    try {
      final profile = Get.find<UserInfoController>().userInfo.value?.userProfile;
      if (profile == null) return;
      final fullName = (profile.fullName ?? '').trim();
      final parts = fullName.split(RegExp(r'\s+'));
      if (parts.isNotEmpty) _firstName.text = parts.first;
      if (parts.length > 1) _lastName.text = parts.sublist(1).join(' ');
      _phone.text = profile.phoneNumber ?? '';
      _email.text = profile.email ?? '';
      _instagram.text = profile.instagram ?? '';
    } catch (_) {
      // UserInfoController not registered or fields missing — leave blank
    }
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    _email.dispose();
    _instagram.dispose();
    _partySize.dispose();
    _area.dispose();
    _minPrice.dispose();
    super.dispose();
  }

  String _formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/'
      '${d.month.toString().padLeft(2, '0')}/'
      '${d.year}';

  String _formatTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:'
      '${t.minute.toString().padLeft(2, '0')}';

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _eventDate ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: ThemeData.dark().copyWith(
          colorScheme: ColorScheme.dark(
            primary: AppColors.accentRoseGold,
            surface: AppColors.surface,
            onSurface: AppColors.textPrimary,
          ),
          dialogBackgroundColor: AppColors.surface,
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _eventDate = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _arrivalTime ?? const TimeOfDay(hour: 22, minute: 0),
      builder: (ctx, child) => Theme(
        data: ThemeData.dark().copyWith(
          colorScheme: ColorScheme.dark(
            primary: AppColors.accentRoseGold,
            surface: AppColors.surface,
            onSurface: AppColors.textPrimary,
          ),
          dialogBackgroundColor: AppColors.surface,
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _arrivalTime = picked);
  }

  String _validate() {
    if (_firstName.text.trim().isEmpty) return 'Please enter your first name';
    if (_lastName.text.trim().isEmpty) return 'Please enter your last name';
    if (_phone.text.trim().isEmpty) return 'Please enter your phone number';
    if (_email.text.trim().isEmpty) return 'Please enter your email';
    if (_eventDate == null) return 'Please pick a date';
    if (_arrivalTime == null) return 'Please pick an arrival time';
    final partyN = int.tryParse(_partySize.text.trim());
    if (partyN == null || partyN < 1) {
      return 'Please enter how many people are coming';
    }
    if (_area.text.trim().isEmpty) return 'Please describe the area you want';
    if (_minPrice.text.trim().isEmpty) {
      return 'Please enter your minimum spend';
    }
    return '';
  }

  String _buildMessage(String reference) {
    final dateStr = _formatDate(_eventDate!);
    final timeStr = _formatTime(_arrivalTime!);
    final depositLabel =
        _deposit == 'FULL' ? 'Pay in full' : '50% deposit';
    final lines = <String>[
      'Table Request – ${widget.venue.name}',
      '',
      'First Name: ${_firstName.text.trim()}',
      'Last Name: ${_lastName.text.trim()}',
      'Phone: ${_phone.text.trim()}',
      'Email: ${_email.text.trim()}',
      if (_instagram.text.trim().isNotEmpty)
        'Instagram: ${_instagram.text.trim()}',
      '',
      'Date of Event: $dateStr',
      'Arrival Time: $timeStr',
      'Amount of ppl: ${_partySize.text.trim()}',
      'Requested VIP Area: ${_area.text.trim()}',
      'Minimum Price: ${_minPrice.text.trim()}',
      'Pay In Full or 50% deposit: $depositLabel',
      '',
      'Reference: $reference',
      'Sent via Pink Pineapple',
    ];
    return lines.join('\n');
  }

  Future<void> _handleSend() async {
    final err = _validate();
    if (err.isNotEmpty) {
      AppSnackbar.showWarning(err);
      return;
    }
    if (kPpWhatsappNumber == '0000000000') {
      AppSnackbar.showWarning(
        'VIP booking is being finalised — please check back shortly.',
      );
      return;
    }

    setState(() => _submitting = true);

    // 1. Create the request on the backend for attribution tracking.
    String? requestId;
    String reference = 'PP-PENDING';
    try {
      final payload = {
        'venueId': widget.venue.id,
        'firstName': _firstName.text.trim(),
        'lastName': _lastName.text.trim(),
        'phone': _phone.text.trim(),
        'email': _email.text.trim(),
        'instagram': _instagram.text.trim(),
        'eventDate': _eventDate!.toIso8601String(),
        'arrivalTime': _formatTime(_arrivalTime!),
        'partySize': int.parse(_partySize.text.trim()),
        'requestedArea': _area.text.trim(),
        'minimumPrice': _minPrice.text.trim(),
        'depositChoice': _deposit,
      };
      final response = await NetworkConfigV1().ApiRequestHandler(
        RequestMethod.POST,
        Urls.vipBookings,
        json.encode(payload),
        is_auth: true,
      );
      if (response != null && response['success'] == true) {
        final data = response['data'] as Map<String, dynamic>?;
        requestId = data?['id']?.toString();
        reference = data?['reference']?.toString() ?? reference;
      }
    } catch (_) {
      // If tracking fails we still want to open WhatsApp — don't block UX
    }

    // 2. Construct WhatsApp deep link with full message.
    final message = _buildMessage(reference);
    final waUrl = Uri.parse(
      'https://wa.me/$kPpWhatsappNumber?text=${Uri.encodeComponent(message)}',
    );

    setState(() => _submitting = false);
    AppSnackbar.show(
      message: 'Opening WhatsApp...',
      isSuccess: true,
    );

    final opened = await launchUrl(
      waUrl,
      mode: LaunchMode.externalApplication,
    );

    // 3. Ping the backend that the user actually went through to WhatsApp.
    if (opened && requestId != null) {
      try {
        await NetworkConfigV1().ApiRequestHandler(
          RequestMethod.POST,
          '${Urls.vipBookings}/$requestId/whatsapp-opened',
          null,
          is_auth: true,
        );
      } catch (_) {
        // Telemetry only — silently ignore failures
      }
    }

    if (mounted) Navigator.of(context).pop();
  }

  void _openFloorPlan() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => FloorPlanViewer(
          imageUrl: widget.venue.floorPlanUrl,
          venueName: widget.venue.name,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets;
    final hasFloorPlan = widget.venue.floorPlanUrl.isNotEmpty;

    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.backgroundDark,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
          border: Border.all(color: AppColors.borderSubtle, width: 0.5),
        ),
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.92,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Grab handle
            Container(
              margin: EdgeInsets.symmetric(vertical: 10.h),
              width: 40.w,
              height: 4.h,
              decoration: BoxDecoration(
                color: AppColors.borderSubtle,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Title
            Padding(
              padding: EdgeInsets.fromLTRB(24.w, 4.h, 24.w, 16.h),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Request a VIP Table at',
                          style: GoogleFonts.poppins(
                            fontSize: 11.sp,
                            color: AppColors.textSecondary,
                            letterSpacing: 0.5,
                          ),
                        ),
                        SizedBox(height: 4.h),
                        Text(
                          widget.venue.name,
                          style: GoogleFonts.outfit(
                            fontSize: 24.sp,
                            fontWeight: FontWeight.w700,
                            fontStyle: FontStyle.italic,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      width: 32.w,
                      height: 32.w,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.close,
                        size: 16.sp,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Scrollable form
            Flexible(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(24.w, 0, 24.w, 16.h),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _row(
                      _input(label: 'First name', controller: _firstName),
                      _input(label: 'Last name', controller: _lastName),
                    ),
                    SizedBox(height: 14.h),
                    _input(
                      label: 'Phone',
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                    ),
                    SizedBox(height: 14.h),
                    _input(
                      label: 'Email',
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    SizedBox(height: 14.h),
                    _input(
                      label: 'Instagram (optional)',
                      controller: _instagram,
                    ),
                    SizedBox(height: 20.h),
                    _row(
                      _picker(
                        label: 'Date of event',
                        value: _eventDate != null
                            ? _formatDate(_eventDate!)
                            : 'Pick a date',
                        onTap: _pickDate,
                        isPlaceholder: _eventDate == null,
                      ),
                      _picker(
                        label: 'Arrival time',
                        value: _arrivalTime != null
                            ? _formatTime(_arrivalTime!)
                            : 'Pick a time',
                        onTap: _pickTime,
                        isPlaceholder: _arrivalTime == null,
                      ),
                    ),
                    SizedBox(height: 14.h),
                    _input(
                      label: 'Number of people',
                      controller: _partySize,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    ),
                    SizedBox(height: 14.h),
                    // VIP area — with optional "View Floor Plan" button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _fieldLabel('Requested VIP area'),
                        if (hasFloorPlan)
                          GestureDetector(
                            onTap: _openFloorPlan,
                            child: Row(
                              children: [
                                Icon(
                                  Icons.image_outlined,
                                  size: 14.sp,
                                  color: AppColors.accentRoseGold,
                                ),
                                SizedBox(width: 4.w),
                                Text(
                                  'View floor plan',
                                  style: GoogleFonts.poppins(
                                    fontSize: 11.sp,
                                    color: AppColors.accentRoseGold,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    SizedBox(height: 6.h),
                    _bareInput(
                      controller: _area,
                      hint: hasFloorPlan
                          ? 'e.g. "Daybed D31" or "DJ Sofa S88"'
                          : 'e.g. "Pool area" or "Near the dance floor"',
                    ),
                    SizedBox(height: 14.h),
                    _input(
                      label: 'Minimum spend (your budget)',
                      controller: _minPrice,
                      hint: 'e.g. "USD 2,000" or "IDR 30,000,000"',
                    ),
                    SizedBox(height: 18.h),
                    _fieldLabel('Pay in full or 50% deposit?'),
                    SizedBox(height: 6.h),
                    Row(
                      children: [
                        Expanded(
                          child: _depositOption(
                            label: '50% deposit',
                            value: 'FIFTY_PERCENT',
                          ),
                        ),
                        SizedBox(width: 8.w),
                        Expanded(
                          child: _depositOption(
                            label: 'Pay in full',
                            value: 'FULL',
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 24.h),
                  ],
                ),
              ),
            ),
            // Send button
            Padding(
              padding: EdgeInsets.fromLTRB(24.w, 0, 24.w, 24.h),
              child: GestureDetector(
                onTap: _submitting ? null : _handleSend,
                child: Container(
                  width: double.infinity,
                  height: 52.h,
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientPrimary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: _submitting
                        ? SizedBox(
                            width: 22.w,
                            height: 22.w,
                            child: CircularProgressIndicator(
                              color: Colors.black,
                              strokeWidth: 2,
                            ),
                          )
                        : Text(
                            'Send request via WhatsApp',
                            style: GoogleFonts.poppins(
                              fontSize: 14.sp,
                              fontWeight: FontWeight.w600,
                              color: AppColors.backgroundDark,
                              letterSpacing: 0.4,
                            ),
                          ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Field helpers ─────────────────────────────────────────────────────

  Widget _fieldLabel(String label) => Text(
        label,
        style: GoogleFonts.poppins(
          fontSize: 11.sp,
          color: AppColors.textSecondary,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.3,
        ),
      );

  Widget _row(Widget a, Widget b) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: a),
          SizedBox(width: 12.w),
          Expanded(child: b),
        ],
      );

  Widget _input({
    required String label,
    required TextEditingController controller,
    String? hint,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
  }) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _fieldLabel(label),
          SizedBox(height: 6.h),
          _bareInput(
            controller: controller,
            hint: hint,
            keyboardType: keyboardType,
            inputFormatters: inputFormatters,
          ),
        ],
      );

  Widget _bareInput({
    required TextEditingController controller,
    String? hint,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
  }) =>
      TextField(
        controller: controller,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        style: GoogleFonts.poppins(
          color: AppColors.textPrimary,
          fontSize: 13.sp,
        ),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.poppins(
            color: AppColors.textMuted,
            fontSize: 13.sp,
          ),
          filled: true,
          fillColor: AppColors.surface,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: AppColors.borderSubtle),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(
              color: AppColors.accentRoseGold,
              width: 1.2,
            ),
          ),
          contentPadding: EdgeInsets.symmetric(
            horizontal: 14.w,
            vertical: 12.h,
          ),
        ),
      );

  Widget _picker({
    required String label,
    required String value,
    required VoidCallback onTap,
    required bool isPlaceholder,
  }) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _fieldLabel(label),
          SizedBox(height: 6.h),
          GestureDetector(
            onTap: onTap,
            child: Container(
              width: double.infinity,
              padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 14.h),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Text(
                value,
                style: GoogleFonts.poppins(
                  color: isPlaceholder
                      ? AppColors.textMuted
                      : AppColors.textPrimary,
                  fontSize: 13.sp,
                ),
              ),
            ),
          ),
        ],
      );

  Widget _depositOption({required String label, required String value}) {
    final selected = _deposit == value;
    return GestureDetector(
      onTap: () => setState(() => _deposit = value),
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 14.h),
        decoration: BoxDecoration(
          color: selected ? AppColors.accentRoseGold.withOpacity(0.12) : AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected
                ? AppColors.accentRoseGold
                : AppColors.borderSubtle,
            width: selected ? 1.2 : 0.6,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 12.sp,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              color: selected
                  ? AppColors.accentRoseGold
                  : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}
