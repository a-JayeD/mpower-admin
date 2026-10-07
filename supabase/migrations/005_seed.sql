-- =====================================================================
-- 005  Initial data
-- =====================================================================

insert into public.site_settings (
  center_name_en, center_name_bn, phone, whatsapp, email,
  address_en, address_bn, opening_hours_en, opening_hours_bn,
  hero_title_en, hero_title_bn, hero_subtitle_en, hero_subtitle_bn,
  footer_text_en, footer_text_bn, completion_warning_threshold
) values (
  'M.Power Engineering', 'এম.পাওয়ার ইঞ্জিনিয়ারিং', '', '', '',
  '', '', 'Saturday–Thursday, 9:00 AM – 8:00 PM', 'শনিবার–বৃহস্পতিবার, সকাল ৯টা – রাত ৮টা',
  'Hands-on electrical and electronics training', 'হাতে-কলমে ইলেকট্রিক্যাল ও ইলেকট্রনিক্স প্রশিক্ষণ',
  'Practical courses taught on real equipment by working engineers.',
  'কর্মরত প্রকৌশলীদের তত্ত্বাবধানে বাস্তব যন্ত্রপাতিতে প্র্যাকটিক্যাল কোর্স।',
  '© M.Power Engineering. All rights reserved.', '© এম.পাওয়ার ইঞ্জিনিয়ারিং। সর্বস্বত্ব সংরক্ষিত।',
  3
) on conflict (singleton) do nothing;
