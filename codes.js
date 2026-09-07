/* Lambda — structure codes and URL flag resolution.

   Every structure has a permanent short code: a view letter and a number.
   The link builder writes an inclusion link, a base32 mask with one bit
   per code (see BITS below) that says exactly which structures are in:

     ?on=5777777777x7777773776py

   Older links hide structures by listing their codes instead, and both
   forms stay honored:

     ?off=D1.M3

   The long form ?inc_<flag>=0 is honored too. Codes are case-insensitive
   in the URL. They never change and are never reused: when a structure is
   added, give it the next number in its view's run and append it to BITS.
   scripts/check-codes.py verifies this file against the data files.

   Letters: D dorsal · L lateral · V ventral · P posterior · C coronal · M midsagittal

   A retired structure keeps its code (marked below) so that no old link can
   ever silently point at a different structure. */
window.LAMBDA = (function () {
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

  /* Bit positions for inclusion links (?on=). A link made by the builder
     says exactly which structures are in: one bit per code, packed into
     base32. APPEND ONLY. A new code takes the next position at the end of
     this list, whatever its letter; nothing is ever inserted, removed, or
     reordered, because every existing link reads structures by position.
     A code past the end of a link's mask did not exist when the link was
     made, so it stays hidden for that link. That is the point: additions
     never leak into links made before them. */
  var BITS = [
    'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'L1', 'L2', 'L3',
    'P1', 'P2', 'P3', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7',
    'V8', 'V9', 'V10', 'V11', 'D8', 'D9', 'D10', 'D11', 'D12', 'L4',
    'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14',
    'L15', 'L16', 'V12', 'V13', 'V14', 'V15', 'V16', 'P4', 'P5', 'P6',
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10',
    'C11', 'C12', 'C13', 'C14', 'C15', 'C16', 'C17', 'C18', 'C19', 'C20',
    'C21', 'C22', 'C23', 'C24', 'C25', 'C26', 'C27', 'C28', 'C29', 'C30',
    'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10',
    'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17', 'M18', 'M19', 'M20',
    'M21', 'M22', 'M23', 'M24', 'M25', 'M26', 'M27', 'M28', 'M29', 'M30',
  ];

  /* RFC 4648 base32, lowercase, no padding. Its alphabet has no 0, 1, or 8,
     so a link read off a slide cannot confuse them with O, l, or B. */
  var B32 = 'abcdefghijklmnopqrstuvwxyz234567';
  function bytesToB32(bytes) {
    var out = '', acc = 0, n = 0;
    for (var i = 0; i < bytes.length; i++) {
      acc = ((acc << 8) | bytes[i]) & 0xFFFF; n += 8;
      while (n >= 5) { out += B32[(acc >>> (n - 5)) & 31]; n -= 5; acc &= (1 << n) - 1; }
    }
    if (n > 0) out += B32[(acc << (5 - n)) & 31];
    return out;
  }
  function b32ToBytes(str) {
    var s = String(str == null ? '' : str).toLowerCase().replace(/=+$/, '');
    var bytes = [], acc = 0, n = 0;
    for (var i = 0; i < s.length; i++) {
      var v = B32.indexOf(s.charAt(i));
      if (v < 0) return null;                              // not a mask at all
      acc = ((acc << 5) | v) & 0xFFFF; n += 5;
      if (n >= 8) { bytes.push((acc >>> (n - 8)) & 255); n -= 8; acc &= (1 << n) - 1; }
    }
    return bytes;
  }
  /* A mask is an array of booleans by position. Bit i lives in byte i>>3 at
     bit i&7. Positions past the end read as off, which is how a link keeps
     out whatever was added after it was made. */
  function maskEncode(bits) {
    var bytes = [];
    for (var i = 0; i < bits.length; i++) {
      if (!bits[i]) continue;
      var k = i >> 3;
      while (bytes.length <= k) bytes.push(0);
      bytes[k] |= 1 << (i & 7);
    }
    return bytesToB32(bytes);
  }
  function maskDecode(str) {
    var bytes = b32ToBytes(str);
    if (!bytes) return null;
    return function (i) { var k = i >> 3; return i >= 0 && k < bytes.length && ((bytes[k] >> (i & 7)) & 1) === 1; };
  }
  /* The ?on= value for a set of flags. */
  function encodeOn(flags) {
    var bits = [];
    flags.forEach(function (f) { var i = BITS.indexOf(FLAGS[f]); if (i > -1) bits[i] = true; });
    return maskEncode(bits);
  }

  var q = new URLSearchParams(window.location.search);
  var hidden = {};                                 // flag -> true
  (q.get('off') || '').split(/[.,\s]+/).forEach(function (c) {
    c = c.toUpperCase();
    if (CODES[c]) hidden[CODES[c]] = true;
  });
  q.forEach(function (v, k) { if (k.indexOf('inc_') === 0 && v === '0') hidden[k] = true; });

  /* An inclusion link (?on=) lists what is in. Anything else, including
     every code added after the link was made, is hidden. A value that is
     not a mask is ignored, like an unknown code in ?off=. */
  var onMask = q.has('on') ? maskDecode(q.get('on')) : null;
  if (onMask) {
    for (var flag in FLAGS) { if (!onMask(BITS.indexOf(FLAGS[flag]))) hidden[flag] = true; }
  }

  function shown(flag) { return !hidden[flag]; }
  function excludedMap() {
    var out = {};
    for (var f in hidden) out[f] = true;
    return out;
  }
  function linkKind() { return onMask ? 'on' : Object.keys(hidden).length ? 'off' : 'none'; }
  return { CODES: CODES, FLAGS: FLAGS, BITS: BITS, shown: shown, excludedMap: excludedMap,
           encodeOn: encodeOn, mask: { encode: maskEncode, decode: maskDecode }, linkKind: linkKind };
})();
