/* Lambda — structure codes and URL flag resolution.

   Every structure has a permanent short code: a view letter and a number.
   A student link hides structures by listing their codes:

     ?off=D1.M3

   Everything not listed is shown. The long form ?inc_<flag>=0 is still
   honored. Codes are case-insensitive in the URL. They never change and
   are never reused: when a structure is added, give it the next number in
   its view's run, wherever it sits in the list. scripts/check-codes.py
   verifies this file against the builder and the data files.

   Letters: D dorsal · L lateral · V ventral · P posterior · C coronal · M midsagittal

   A retired structure keeps its code (marked below) so that no old link can
   ever silently point at a different structure. */
window.OPENOVIS = (function () {
  'use strict';
  var CODES = {
    D1:   'inc_dorsal_central_sulcus',
    D2:   'inc_dorsal_precentral_gyrus',
    D3:   'inc_dorsal_postcentral_gyrus',
    D4:   'inc_dorsal_longitudinal_fissure',
    D5:   'inc_dorsal_frontal_lobe',
    D6:   'inc_dorsal_occipital_lobe',
    D7:   'inc_dosal_dorsomedian_fissure',
    L1:   'inc_lat_rhinencephalon',
    L2:   'inc_lat_rhinal_fissure',
    L3:   'inc_lat_insula',
    P1:   'inc_post_vermis',   // retired 2026-09-04, code stays reserved
    P2:   'inc_post_cerebellar_hemispheres',   // retired 2026-09-04, code stays reserved
    P3:   'inc_post_fourth_ventricle',   // retired 2026-09-04, code stays reserved
    V1:   'inc_vent_lateral_olfactory_tract',
    V2:   'inc_vent_optic_chiasm',
    V3:   'inc_vent_optic_tract',
    V4:   'inc_vent_pyramidal_tract',
    V5:   'inc_vent_trapezoid_body',
    V6:   'inc_vent_pons',
    V7:   'inc_vent_infundibulum',
    V8:   'inc_vent_cerebral_peduncles',
    V9:   'inc_vent_interpeduncular_cistern',
    V10:  'inc_vent_mammillary_bodies',
    V11:  'inc_vent_ventromedian_fissure',
    D8:   'inc_dorsal_vermis',
    D9:   'inc_dorsal_cerebellar_hemisphere',
    D10:  'inc_dorsal_occipital_pole',
    D11:  'inc_dorsal_parietal_lobe',
    D12:  'inc_dorsal_prefrontal_cortex',
    L4:   'inc_lat_frontal_lobe',
    L5:   'inc_lat_parietal_lobe',
    L6:   'inc_lat_occipital_lobe',
    L7:   'inc_lat_occipital_pole',
    L8:   'inc_lat_cerebellum',
    L9:   'inc_lat_temporal_lobe',
    L10:  'inc_lat_pons',
    L11:  'inc_lat_medulla',
    L12:  'inc_lat_lateral_geniculate_nucleus',   // retired 2026-09-04, code stays reserved
    L13:  'inc_lat_medial_geniculate_nucleus',   // retired 2026-09-04, code stays reserved
    L14:  'inc_lat_superior_colliculus',   // retired 2026-09-04, code stays reserved
    L15:  'inc_lat_brachium',   // retired 2026-09-04, code stays reserved
    L16:  'inc_lat_middle_cerebellar_peduncle',   // retired 2026-09-04, code stays reserved
    V12:  'inc_vent_medulla',
    V13:  'inc_vent_rhinal_fissure',
    V14:  'inc_vent_rhinencephalon',
    V15:  'inc_vent_medial_olfactory_tract',
    V16:  'inc_vent_olfactory_bulb',
    P4:   'inc_post_pineal_body',
    P5:   'inc_post_superior_colliculus',
    P6:   'inc_post_inferior_colliculus',
    C1:   'inc_cor_internal_capsule',
    C2:   'inc_cor_caudate',
    C3:   'inc_cor_putamen',
    C4:   'inc_cor_lateral_ventricle',
    C5:   'inc_cor_septum_pellucidum',
    C6:   'inc_cor_corona_radiata',
    C7:   'inc_cor_external_capsule',
    C8:   'inc_cor_claustrum',
    C9:   'inc_cor_cingulate_gyrus',
    C10:  'inc_cor_fornix',
    C11:  'inc_cor_cingulum',
    C12:  'inc_cor_third_ventricle',
    C13:  'inc_cor_mammillothalamic_tract',
    C14:  'inc_cor_mammillary_bodies',
    C15:  'inc_cor_hippocampus',
    C16:  'inc_cor_coronal_cerebral_aqueduct',
    C17:  'inc_cor_corpus_callosum',
    C18:  'inc_cor_thalamus',
    C19:  'inc_cor_hypothalamus',
    C20:  'inc_cor_optic_tracts',
    C21:  'inc_cor_pineal_body',
    C22:  'inc_cor_lateral_geniculate',
    C23:  'inc_cor_medial_geniculate',
    C24:  'inc_cor_cerebral_peduncles',
    C25:  'inc_cor_superior_colliculus',
    C26:  'inc_cor_tegmentum',
    C27:  'inc_cor_septal_nucleus',
    C28:  'inc_cor_extreme_capsule',
    C29:  'inc_cor_choroid_plexus',
    C30:  'inc_cor_massa_intermedia',
    M1:   'inc_mid_habenula',
    M2:   'inc_mid_thalamus',
    M3:   'inc_mid_corpus_callosum',
    M4:   'inc_mid_arbor_vitae',
    M5:   'inc_mid_cerebral_aqueduct',
    M6:   'inc_mid_third_ventricle',
    M7:   'inc_mid_cingulate_gyrus',
    M8:   'inc_mid_hypothalamus',
    M9:   'inc_mid_optic_chiasm',
    M10:  'inc_mid_pineal_body',
    M11:  'inc_mid_superior_colliculus',
    M12:  'inc_mid_inferior_colliculus',
    M13:  'inc_mid_fornix',
    M14:  'inc_mid_septum_pellucidum',
    M15:  'inc_mid_posterior_commissure',
    M16:  'inc_mid_anterior_commissure',
    M17:  'inc_mid_lat_brachium',
    M18:  'inc_mid_lat_lateral_geniculate_nucleus',
    M19:  'inc_mid_lat_medial_geniculate_nucleus',
    M20:  'inc_mid_lat_middle_cerebellar_peduncle',
    M21:  'inc_mid_lat_superior_colliculus',
    M22:  'inc_mid_cerebellum',
    M23:  'inc_mid_tegmentum',
    M24:  'inc_mid_medulla',
    M25:  'inc_mid_central_sulcus',
    M26:  'inc_mid_precentral_gyrus',
    M27:  'inc_mid_postcentral_gyrus',
    M28:  'inc_mid_mammillary_bodies',
    M29:  'inc_mid_pons',
    M30:  'inc_mid_fourth_ventricle',
  };
  var FLAGS = {};
  for (var c in CODES) FLAGS[CODES[c]] = c;

  var q = new URLSearchParams(window.location.search);
  var hidden = {};                                 // flag -> true
  (q.get('off') || '').split(/[.,\s]+/).forEach(function (c) {
    c = c.toUpperCase();
    if (CODES[c]) hidden[CODES[c]] = true;
  });
  q.forEach(function (v, k) { if (k.indexOf('inc_') === 0 && v === '0') hidden[k] = true; });

  function shown(flag) { return !hidden[flag]; }
  function excludedMap() {
    var out = {};
    for (var f in hidden) out[f] = true;
    return out;
  }
  return { CODES: CODES, FLAGS: FLAGS, shown: shown, excludedMap: excludedMap };
})();
