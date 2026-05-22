
export interface Disease {
  id: string;
  name_ar: string;
  name_en: string;
  symptoms: string[];
}

export interface BodySystem {
  id: string;
  name_ar: string;
  name_en: string;
  category: 'Pediatric' | 'Adult' | 'Common';
  diseases: Disease[];
}

export const medicalDatabase: BodySystem[] = [
  // PEDIATRIC SYSTEMS
  {
    id: 'respiratory_peds',
    name_ar: 'تنفسي (أطفال)',
    name_en: 'Respiratory (Peds)',
    category: 'Pediatric',
    diseases: [
      { id: 'common_cold', name_ar: 'نزلات برد (زكام)', name_en: 'Common Cold', symptoms: ['رشح وزكام', 'عطس', 'حرارة عالية', 'سعال (كحة)'] },
      { id: 'bronchiolitis', name_ar: 'التهاب الشعيبات الهوائية (نزلة شعبية)', name_en: 'Bronchiolitis', symptoms: ['نهجان', 'تزييق في الصدر', 'سعال (كحة)', 'صعوبة تنفس'] },
      { id: 'croup', name_ar: 'الخناق (الكروپ)', name_en: 'Croup', symptoms: ['سعال نباحي', 'بحة صوت', 'صعوبة تنفس'] },
      { id: 'tonsillitis_peds', name_ar: 'التهاب اللوزتين', name_en: 'Tonsillitis', symptoms: ['صعوبة بلع', 'حرارة عالية', 'خمول شديد'] },
      { id: 'pneumonia_peds', name_ar: 'الالتهاب الرئوي', name_en: 'Pneumonia', symptoms: ['حرارة عالية', 'نهجان', 'خمول شديد', 'سعال (كحة)'] }
    ]
  },
  {
    id: 'gastro_peds',
    name_ar: 'جهاز هضمي (أطفال)',
    name_en: 'Gastrointestinal (Peds)',
    category: 'Pediatric',
    diseases: [
      { id: 'gastroenteritis_peds', name_ar: 'نزلة معوية', name_en: 'Gastroenteritis', symptoms: ['قيء (ترجيع)', 'إسهال', 'مغص وبكاء'] },
      { id: 'gerd_peds', name_ar: 'ارتجاع المريء', name_en: 'GERD', symptoms: ['قيء (ترجيع)', 'بكاء مستمر', 'ضعف شهية'] },
      { id: 'constipation_peds', name_ar: 'إمساك وظيفي', name_en: 'Functional Constipation', symptoms: ['إمساك', 'مغص وبكاء'] }
    ]
  },
  // ADULT SYSTEMS
  {
    id: 'cardiovascular_adult',
    name_ar: 'أمراض القلب والشرايين',
    name_en: 'Cardiovascular (Adult)',
    category: 'Adult',
    diseases: [
      { id: 'hypertension', name_ar: 'ضغط الدم المرتفع', name_en: 'Hypertension', symptoms: ['صداع', 'دوار', 'طنين بالأذن', 'خفقان بالقلب'] },
      { id: 'heart_failure', name_ar: 'هبوط القلب', name_en: 'Heart Failure', symptoms: ['نهجان مع المجهود', 'تورم القدمين', 'تعب سريع', 'كرشة نفس'] },
      { id: 'angina', name_ar: 'ذبحة صدرية / قصور شرايين', name_en: 'Angina', symptoms: ['ألم بالصدر', 'ضيق تنفس', 'عرق بارد', 'ألم في الكتف'] },
      { id: 'arrhythmia', name_ar: 'اضطراب ضربات القلب', name_en: 'Arrhythmia', symptoms: ['خفقان بالقلب', 'دوار', 'إغماء مفاجئ'] }
    ]
  },
  {
    id: 'respiratory_adult',
    name_ar: 'أمراض الصدر (كبار)',
    name_en: 'Respiratory (Adult)',
    category: 'Adult',
    diseases: [
      { id: 'copd', name_ar: 'السدة الرئوية المزمنة', name_en: 'COPD', symptoms: ['سعال (كحة)', 'بلغم', 'ضيق تنفس', 'نهجان'] },
      { id: 'asthma_adult', name_ar: 'حساسية الصدر (ربو)', name_en: 'Bronchial Asthma', symptoms: ['تزييق في الصدر', 'ضيق تنفس', 'سعال ليلي'] },
      { id: 'pneumonia_adult', name_ar: 'التهاب رئوي حاد', name_en: 'Pneumonia', symptoms: ['حرارة عالية', 'ألم بالجنب', 'نهجان', 'سعال مع بلغم'] }
    ]
  },
  {
    id: 'gastro_adult',
    name_ar: 'الجهاز الهضمي والكبد (كبار)',
    name_en: 'GI & Liver (Adult)',
    category: 'Adult',
    diseases: [
      { id: 'peptic_ulcer', name_ar: 'قرحة المعدة / الاثني عشر', name_en: 'Peptic Ulcer', symptoms: ['حرقان بالمعدة', 'غثيان', 'ألم عند الجوع', 'حموضة'] },
      { id: 'ibs_adult', name_ar: 'القولون العصبي', name_en: 'IBS', symptoms: ['انتفاخ', 'مغص وبكاء', 'إمساك', 'إسهال', 'غازات'] },
      { id: 'cholecystitis', name_ar: 'التهاب المرارة والخصوات', name_en: 'Cholecystitis', symptoms: ['ألم بالجانب الأيمن', 'غثيان', 'قيء (ترجيع)'] },
      { id: 'h_pylori', name_ar: 'جرثومة المعدة', name_en: 'H. Pylori Infection', symptoms: ['حموضة', 'غثيان', 'انتفاخ', 'ألم بالبطن'] }
    ]
  },
  {
    id: 'endocrine',
    name_ar: 'الغدد الصماء والسكري',
    name_en: 'Endocrine & Diabetes',
    category: 'Common',
    diseases: [
      { id: 'diabetes_type1', name_ar: 'السكري النوع الأول (أطفال وكبار)', name_en: 'Diabetes Type 1', symptoms: ['تبول متكرر', 'عطش شديد', 'ضعف شهية', 'نقص وزن'] },
      { id: 'diabetes_type2', name_ar: 'السكري النوع الثاني', name_en: 'Diabetes Type 2', symptoms: ['تبول متكرر', 'عطش شديد', 'تعب سريع', 'تنميل أطراف'] },
      { id: 'hypothyroidism', name_ar: 'خمول الغدة الدرقية', name_en: 'Hypothyroidism', symptoms: ['خمول شديد', 'زيادة وزن', 'إمساك', 'برودة أطراف'] },
      { id: 'hyperthyroidism', name_ar: 'نشاط الغدة الدرقية', name_en: 'Hyperthyroidism', symptoms: ['رعشة باليد', 'نقص وزن', 'خفقان بالقلب', 'عرق شديد'] }
    ]
  },
  {
    id: 'infectious_skin_peds',
    name_ar: 'أمراض معدية وجلدية (أطفال)',
    name_en: 'Infectious & Skin (Peds)',
    category: 'Pediatric',
    diseases: [
      { id: 'chickenpox', name_ar: 'الجديري المائي', name_en: 'Chickenpox', symptoms: ['بثور مائية', 'حكة شديدة', 'طفح جلدي', 'حرارة عالية'] },
      { id: 'measles', name_ar: 'الحصبة', name_en: 'Measles', symptoms: ['طفح جلدي أحمر', 'احمرار العين', 'سعال (كحة)', 'حرارة عالية'] },
      { id: 'diaper_rash', name_ar: 'تسلخات الحفاض', name_en: 'Diaper Rash', symptoms: ['احمرار منطقة الحفاض', 'ألم عند التغيير', 'مغص وبكاء'] },
      { id: 'eczema_peds', name_ar: 'الأكزيما / حساسية الجلد', name_en: 'Eczema', symptoms: ['جلد جاف', 'حكة شديدة', 'طفح جلدي'] },
      { id: 'impetigo', name_ar: 'القوباء (التهاب بكتيري)', name_en: 'Impetigo', symptoms: ['قشور عسلية', 'بثور صديدية', 'حكة'] }
    ]
  },
  {
    id: 'neuro_peds',
    name_ar: 'أعصاب وأمراض نفسية (أطفال)',
    name_en: 'Neurology (Peds)',
    category: 'Pediatric',
    diseases: [
      { id: 'febrile_convulsion', name_ar: 'تشنجات حرارية', name_en: 'Febrile Convulsion', symptoms: ['تشنجات مع الحرارة', 'فقدان وعي مؤقت'] },
      { id: 'nocturnal_enuresis', name_ar: 'تبول لاإرادي ليلي', name_en: 'Nocturnal Enuresis', symptoms: ['تبول أثناء النوم', 'قلق'] }
    ]
  },
  {
    id: 'others_peds',
    name_ar: 'تخصصات أخرى (أطفال)',
    name_en: 'Others (Peds)',
    category: 'Pediatric',
    diseases: [
      { id: 'otitis_media_peds', name_ar: 'التهاب الأذن الوسطى', name_en: 'Otitis Media', symptoms: ['ألم أذن', 'شد الأذن', 'حرارة عالية', 'بكاء مستمر'] },
      { id: 'uti_peds', name_ar: 'التهاب المسالك البولية', name_en: 'UTI', symptoms: ['حرقان بول', 'تغير رائحة البول', 'تبول متكرر', 'حرارة عالية'] },
      { id: 'anemia_peds', name_ar: 'أنيميا (فقر دم)', name_en: 'Anemia', symptoms: ['شحوب الوجه', 'تعب سريع', 'ضعف شهية'] },
      { id: 'rickets', name_ar: 'لين عظام (نقص د)', name_en: 'Rickets', symptoms: ['تأخر مشي', 'بروز عظام الصدر', 'مقوس الساقين'] }
    ]
  },
  {
    id: 'neuro_adult',
    name_ar: 'المخ والأعصاب (كبار)',
    name_en: 'Neurology (Adult)',
    category: 'Adult',
    diseases: [
      { id: 'migraine', name_ar: 'الصداع النصفي', name_en: 'Migraine', symptoms: ['صداع شديد', 'غثيان', 'زغللة بالعين'] },
      { id: 'stroke', name_ar: 'جلطة / نزيف المخ', name_en: 'Stroke', symptoms: ['ثقل باللسان', 'ضعف بالأطراف', 'صداع مفاجئ'] },
      { id: 'epilepsy', name_ar: 'الصرع والتشنجات', name_en: 'Epilepsy', symptoms: ['تشنجات', 'فقدان وعي'] }
    ]
  },
  {
    id: 'neonatal_peds',
    name_ar: 'حديثي الولادة (مبتسرين)',
    name_en: 'Neonatology',
    category: 'Pediatric',
    diseases: [
      { id: 'jaundice_neonatal', name_ar: 'الصفراء لحديثي الولادة', name_en: 'Neonatal Jaundice', symptoms: ['اصفرار العين والجلد', 'خمول شديد', 'ضعف شهية'] },
      { id: 'neonatal_colic', name_ar: 'مغص الرضع', name_en: 'Infantile Colic', symptoms: ['بكاء مستمر', 'غازات', 'انتفاخ'] },
      { id: 'umbilical_hernia', name_ar: 'فتق سري', name_en: 'Umbilical Hernia', symptoms: ['بروز منطقة السرة', 'بكاء مستمر'] }
    ]
  },
  {
    id: 'cardio_peds',
    name_ar: 'قلب الأطفال',
    name_en: 'Pediatric Cardiology',
    category: 'Pediatric',
    diseases: [
      { id: 'vsd', name_ar: 'فتحة في القلب (VSD)', name_en: 'VSD', symptoms: ['نهجان', 'تعب عند الرضاعة', 'عرق شديد'] },
      { id: 'rheumatic_fever', name_ar: 'حمى روماتيزمية', name_en: 'Rheumatic Fever', symptoms: ['ألم بالمفاصل', 'حرارة عالية', 'خفقان بالقلب'] }
    ]
  }
];

export const commonSymptoms = [
  { ar: 'حرارة عالية', en: 'High Fever' },
  { ar: 'سعال (كحة)', en: 'Cough' },
  { ar: 'إسهال', en: 'Diarrhea' },
  { ar: 'قيء (ترجيع)', en: 'Vomiting' },
  { ar: 'رشح وزكام', en: 'Runny Nose' },
  { ar: 'صعوبة تنفس', en: 'Difficult Breathing' },
  { ar: 'مغص وبكاء', en: 'Colic & Crying' },
  { ar: 'ضعف شهية', en: 'Poor Appetite' },
  { ar: 'طفح جلدي', en: 'Skin Rash' },
  { ar: 'ألم أذن', en: 'Ear Pain' },
  { ar: 'صداع', en: 'Headache' },
  { ar: 'دوار', en: 'Dizziness' },
  { ar: 'خمول شديد', en: 'Severe Lethargy' },
  { ar: 'تورم القدمين', en: 'Leg Swollen' },
  { ar: 'بثور مائية', en: 'Watery Blisters' },
  { ar: 'حكة شديدة', en: 'Severe Itching' },
  { ar: 'بثور صديدية', en: 'Pustules' },
  { ar: 'قشور عسلية', en: 'Honey Crusts' },
  { ar: 'احمرار العين', en: 'Red Eyes' },
  { ar: 'ألم بالظهر', en: 'Back Pain' },
  { ar: 'تنميل أطراف', en: 'Numbness' },
  { ar: 'ألم بالمفاصل', en: 'Joint Pain' },
  { ar: 'صعوبة بلع', en: 'Difficulty Swallowing' },
  { ar: 'اصفرار العين والجلد', en: 'Jaundice (Yellowing)' },
  { ar: 'غازات', en: 'Gases' },
  { ar: 'انتفاخ', en: 'Bloating' },
  { ar: 'نهجان', en: 'Tachypnea (Fast Breathing)' },
  { ar: 'تعب عند الرضاعة', en: 'Tired during Nursing' },
  { ar: 'عرق شديد', en: 'Heavy Sweating' },
  { ar: 'خفقان بالقلب', en: 'Palpitations' }
];
