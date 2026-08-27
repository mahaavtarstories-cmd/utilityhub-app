require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PROJECT_IDS = {
  ebay: '4671e2c3-707e-412c-a63c-e198dbd38e6e',
  amazon: '77707974-3ebc-4c3e-8933-6c666b2fded6',
  gunbroker: '7b71bf9e-8c48-424f-a4e4-98d4e574b601',
  nightgalaxy: '4154fff2-86c7-475e-b335-00648ef5dd22'
};

const rulebooks = [
  // ============ EBAY ============
  {
    project_id: PROJECT_IDS.ebay,
    version: '1.0',
    status: 'published',
    change_reason: 'Initial eBay rulebook from Pitman automation pipeline',
    title_rules: {
      format: 'Brand + Product + Specs - MPN',
      max_length: 80,
      target_length: '72-80 chars (allow 65+ for simple products)',
      rules: [
        'NO commas (replace with spaces or remove)',
        'NO parentheses around MPN (use " - MPN" format)',
        'NO ellipsis/truncation ("...") — rephrase to fit',
        'NO ® or ™ symbols — strip all trademark symbols',
        'NO abbreviations except "oz"',
        'Use " - " before MPN in all titles',
        'Use FULL words for sizes: Small, Medium, Large, Extra Large, 2X-Large, 3X-Large (never S/M/L/XL/2XL/3XL)',
        'Replace "pk" → "Packs", "pc" → "Pieces"'
      ],
      examples_good: [
        'Mustad Big Eye Bucktail Jig - 4oz Pink 32824NP-BN UltraPoint Hook - BEB-4-PK',
        'Mustad Tak-Clip Power Clip Tackle Quick Change - Size Small 10pk - DLT11-S-10'
      ],
      examples_bad: [
        'Mustad Hook (MPN-123) — has parentheses',
        'Mustad Hook, Size 1/0 - MPN-123 — has comma'
      ]
    },
    description_rules: {
      format: 'Plain text ONLY. No HTML tags. Real newlines.',
      layout: 'H2 first line → Intro paragraph → Key Features → Additional Info → Downloads',
      rules: [
        'NO HTML TAGS — strip all <br>, <p>, <div>, <ul>, <li>',
        'REAL NEWLINES — use actual \\n in JSON strings, never \\\\n',
        'NO "TYPE" FLUFF — "Line Weight: 400 lb" NOT "Line Weight Type: 400 lb"',
        'MAXIMUM DETAIL — include every specification found on brand site',
        'NO ® or ™ symbols — use plain text (VIBRAM not VIBRAM®)',
        'NO "Made in USA" in Key Features — use "Country Of Origin: USA" in Additional Info',
        'NO "Manufacturing:" label — use "Country Of Origin:" only',
        'MPN must be child-specific (e.g. "533-095W" not "533")',
        'UPC must be included in Additional Info',
        'PDF URLs use "-Specification.pdf" suffix'
      ],
      sections: {
        h2: 'Brand + Model + Product Type + key specs (first line of description)',
        intro: '2-3 sentences describing the product',
        key_features: 'Hyphens (-) per feature. No Field: Value here. Must add customer value.',
        additional_info: 'Field: Value per line. Must include Brand, Model, MPN, UPC, Country Of Origin + all specs.',
        downloads: 'Title: URL per document. Use brand site PDFs.'
      }
    },
    image_rules: {
      rules: [
        'Minimum 1 image (main product image)',
        'Prefer 4+ images: main, open stock, front, back',
        'JPG format',
        'White or neutral background preferred'
      ]
    },
    category_rules: {
      rules: [
        'Use eBay category that best matches product type',
        'Subcategory must match product specifics',
        'Item specifics must be filled (Brand, MPN, UPC, Type)'
      ]
    },
    qa_rules: {
      checks: [
        'Title: no commas, no parens, no ®/™, 65-80 chars',
        'Description: no HTML, real newlines, has Brand/MPN/UPC',
        'No "Manufacturing:" label — use "Country Of Origin:"',
        'No "Made in USA" in Key Features',
        'All specs from brand site included',
        'PDF URLs valid and accessible'
      ]
    },
    custom_rules: {
      source_rules: {
        primary: 'Brand/manufacturer website (official product page)',
        secondary: 'Trusted USA-based retailers (Tackle Warehouse, MidwayUSA, OpticsPlanet, Brownells, etc.)',
        tertiary: 'UPC databases, Amazon/Walmart as last resort',
        rules: [
          'MPN exact match required — no guessing',
          'No category/search pages — only actual product pages',
          '2 sources minimum when possible',
          'Brand site URL always primary, retailer URLs fallback only'
        ]
      },
      column_mapping: {
        A: 'Row Number', B: 'Brand', C: 'MPN', D: 'UPC', E: 'Type',
        J: 'Brand URL (primary source)', K: 'Source URL (fallback)',
        M: 'Title (output — NOT L!)', N: 'Description (output — NOT M!)'
      }
    }
  },

  // ============ AMAZON ============
  {
    project_id: PROJECT_IDS.amazon,
    version: '1.0',
    status: 'published',
    change_reason: 'Initial Amazon rulebook',
    title_rules: {
      format: 'Brand + Product Name + Key Specs + Size/Color/Variant',
      max_length: 200,
      target_length: '150-200 chars',
      rules: [
        'NO commas in first 5 words (Amazon search weight)',
        'NO all-caps (except standard abbreviations like LED, USB, HD)',
        'NO ® or ™ symbols',
        'NO promotional phrases ("Best Seller", "#1 Rated", "Free Shipping")',
        'NO subjective claims ("amazing", "incredible", "best")',
        'Include Brand + Product Type + Key Feature + Size/Color/Quantity',
        'Use standard size words: Small, Medium, Large, Extra Large',
        'Size/Color/Variant at end of title'
      ]
    },
    description_rules: {
      format: 'HTML allowed (Amazon supports basic HTML)',
      layout: '5 bullet points + Product description + Specifications',
      rules: [
        '5 bullet points required — start with benefit, then feature',
        'Each bullet max 500 characters',
        'No promotional language or subjective claims',
        'No HTML in bullets (plain text only for bullets)',
        'Description section can use basic HTML: <p>, <br>, <b>, <ul>, <li>',
        'Include all technical specifications',
        'No competitor comparisons',
        'No health/medical claims',
        'No "guarantee" or "warranty" unless official manufacturer warranty'
      ],
      sections: {
        bullets: '5 bullet points — Benefit-first format. Feature: Benefit to customer.',
        description: 'Detailed product description with HTML formatting allowed',
        specifications: 'Technical spec table — Brand, Model, MPN, UPC, Weight, Dimensions, Material, Color'
      }
    },
    image_rules: {
      rules: [
        'Main image: white background (RGB 255,255,255), product fills 85%+ of frame',
        'Minimum 1 image, recommend 6+ images',
        'No text/watermarks/logos on main image',
        'Additional images: lifestyle, detail, dimensions, in-use',
        'Min 1000px on longest side, recommend 1600px+',
        'JPEG, TIFF, PNG, GIF formats accepted'
      ]
    },
    category_rules: {
      rules: [
        'Use Amazon category tree — match product to most specific leaf category',
        'Browse Node ID required for listing',
        'Item Type Keyword must match Amazon accepted values',
        'Variation Theme: Size, Color, Size+Color, or other valid theme',
        'Required attributes vary by category — check Amazon Category Template'
      ]
    },
    qa_rules: {
      checks: [
        'Title under 200 chars, no promotional language',
        '5 bullet points, each under 500 chars, benefit-first',
        'Main image white background, no text/watermarks',
        'All required category attributes filled',
        'UPC/EAN/GTIN valid and matches product',
        'Brand name matches Amazon Brand Registry if enrolled',
        'No restricted/banned keywords',
        'Variation parent/child structure correct',
        'No duplicate listings (same ASIN/UPC)'
      ]
    },
    custom_rules: {
      source_rules: {
        primary: 'Brand/manufacturer website',
        secondary: 'Amazon existing listings for reference (not copy)',
        tertiary: 'Distributor catalogs, UPC databases',
        rules: [
          'Never copy competitor Amazon listing content',
          'Use manufacturer official specs only',
          'Verify UPC/GTIN against GS1 database when possible',
          'Brand must match registered brand name exactly'
        ]
      }
    }
  },

  // ============ GUNBROKER ============
  {
    project_id: PROJECT_IDS.gunbroker,
    version: '1.0',
    status: 'published',
    change_reason: 'Initial GunBroker rulebook',
    title_rules: {
      format: 'Brand + Model + Product Type + Key Specs + Condition',
      max_length: 80,
      target_length: '60-80 chars',
      rules: [
        'NO commas (GunBroker search treats commas as separators)',
        'NO parentheses around MPN',
        'NO ® or ™ symbols',
        'Include Brand, Model, Caliber/Gauge/Type if applicable',
        'Include Condition: New, Used, Refurbished, Demo',
        'NO "FS" or "For Sale" prefix',
        'Use " - " before MPN',
        'For ammunition: include Caliber + Grain + Bullet Type + Count'
      ]
    },
    description_rules: {
      format: 'Plain text with basic formatting (limited HTML: <b>, <br>, <ul>, <li>)',
      layout: 'Product overview + Features + Specifications + Payment/Shipping terms',
      rules: [
        'Plain text preferred — limited HTML supported',
        'Real newlines for plain text sections',
        'NO ® or ™ symbols',
        'Include all manufacturer specs',
        'For firearms: include caliber, action, barrel length, capacity, finish, stock',
        'For ammunition: include caliber, grain, bullet type, muzzle velocity, count, casing material',
        'For accessories: include compatibility, material, dimensions, weight',
        'Payment and Shipping terms required for firearms/ammo listings',
        'Include manufacturer warranty info when available',
        'FFL transfer required for firearms — note in description'
      ],
      sections: {
        overview: '2-3 sentences describing the product',
        features: 'Hyphens (-) per feature',
        specifications: 'Field: Value per line (Brand, Model, MPN, UPC, Caliber, Action, etc.)',
        payment_shipping: 'Payment methods accepted, shipping cost/carrier, FFL requirements'
      }
    },
    image_rules: {
      rules: [
        'Minimum 1 image required',
        'Prefer 4+ images: main, left side, right side, back, detail',
        'For firearms: include serial number area (blurred for listing)',
        'White or neutral background for main image',
        'No watermark logos from other retailers',
        'JPG format preferred, Max 4MB per image'
      ]
    },
    category_rules: {
      rules: [
        'Use GunBroker category that matches product type',
        'Firearms: Handguns, Rifles, Shotguns → subcategory by action type',
        'Ammunition: by caliber/gauge',
        'Accessories: by type (holsters, optics, magazines, etc.)',
        'Reloading: components by type',
        'Must select correct category — affects search and buyer filtering'
      ]
    },
    qa_rules: {
      checks: [
        'Title under 80 chars, no commas, no ®/™',
        'Condition stated clearly in title and description',
        'All manufacturer specs included',
        'Payment/Shipping terms present',
        'FFL requirements noted for firearms',
        'Images clear and show actual product',
        'No prohibited items (check GunBroker banned items list)',
        'UPC/MPN matches product',
        'No cross-category listings'
      ]
    },
    custom_rules: {
      source_rules: {
        primary: 'Brand/manufacturer website',
        secondary: 'Distributor catalogs (Davidson\'s, Gallery of Guns, RSR, Ellett Brothers)',
        tertiary: 'UPC databases, OpticsPlanet, MidwayUSA, Brownells',
        rules: [
          'MPN exact match required',
          'Verify firearm specifications against manufacturer specs sheet',
          'Check GunBroker banned/prohibited items list before listing',
          'For used items: describe actual condition, note any defects'
        ]
      },
      compliance_rules: {
        firearms: 'FFL transfer required — buyer must provide FFL dealer info',
        ammunition: 'Check state/local restrictions before shipping — some states require face-to-face sale',
        shipping: 'Firearms ship to FFL dealer only, ammo ships direct to buyer (where legal)',
        restrictions: 'No NFA items without proper licensing, no high-capacity magazines in restricted states'
      }
    }
  },

  // ============ NIGHT GALAXY ============
  {
    project_id: PROJECT_IDS.nightgalaxy,
    version: '1.0',
    status: 'published',
    change_reason: 'Initial Night Galaxy rulebook from v22 Guide',
    title_rules: {
      format: 'Brand + Model + Product Description + Size/Variant - MPN-Suffix',
      max_length: 120,
      target_length: '80-120 chars',
      rules: [
        'Use " - " before MPN in all titles',
        'Use FULL words for sizes: Small, Medium, Large, Extra Large, 2X-Large, 3X-Large',
        'NO abbreviations: S/M/L/XL/2XL/3XL',
        'Be elaborate — include material, compatibility, key features, dimensions',
        'NO commas, NO parentheses, NO ®/™',
        'Parent Title: family-level, NO specific variant value (Size, Color)',
        'Child Title: includes exact distinguishing option value(s)',
        'Title MPN uses hyphen (533-095W), Column G uses space (533 095W)'
      ]
    },
    description_rules: {
      format: 'Plain text only. NO HTML tags in Magento Description field.',
      layout: 'H2 Title (first line) → Intro → Key Features → Additional Info → Downloads → Videos',
      rules: [
        'H2 Title = first line of Description cell',
        'Parent H2 = family-level, Child H2 = child-specific',
        'Plain text only — no HTML',
        'Real newlines',
        'NO ® or ™ symbols',
        'NO MSRP in customer-facing content',
        'NO "Manufacturing:" label — use "Country Of Origin:"',
        'Country Of Origin always standalone line, never combined',
        'Each compliance/certification = separate line (Made in USA, Berry Compliant, AR 670-1 = 3 lines)',
        'MPN used (not "SKU" when manufacturer calls it that)',
        'One complete description cell — all content in ONE Excel cell',
        'Short scannable paragraphs — one substantial sentence per paragraph'
      ],
      sections: {
        includes: 'Only for separate accessories/components IN ADDITION to main product. NOT for built-in/integral parts. Omit entirely if main product only.',
        key_features: 'Hyphens (-) per feature. No Field: Value here. Must add customer value.',
        additional_info: 'Field: Value per line. No bullets. Must include Brand, MPN, UPC, Country Of Origin + all specs.',
        downloads: 'Title: URL per document. English-language PDFs only. Night Galaxy path: https://images.nightgalaxy.com/PDF/{First Letter}/{Brand}/{File}',
        videos: 'One direct YouTube URL per line. Only when clearly related to exact MPN.'
      }
    },
    image_rules: {
      rules: [
        'From brand-folder TXT image list (filename authority)',
        'Path: https://images.nightgalaxy.com/img/{First Letter}/{Brand}/{Image Filename}',
        'Main_Image = sku-1 + original extension',
        'Additional_Images = sku-2, sku-3... comma-separated',
        'Don\'t change source extension, don\'t guess filenames',
        '4+ images recommended: H (hero), OS (open stock), F (front), B (back), O (other), IS (in situ)'
      ]
    },
    category_rules: {
      rules: [
        'Use Night Galaxy Category Master for taxonomy',
        'Department → NG Category → Subcategories 1-11 (leaf category)',
        'Check existing classification against Category Master — wrong = propose correction',
        'No fit → propose new category/subcategory (needs human approval)',
        'Never silently change Category Master',
        'Category Master has 164 rows, 45 columns of taxonomy + attributes'
      ]
    },
    qa_rules: {
      checks: [
        'Description is natural, SEO-friendly, human-readable, factually source-supported',
        'No invented facts or unsupported historical assumptions',
        'MSRP absent from customer-facing content',
        'MPN used (not "SKU")',
        'PDFs are English, Night Galaxy paths, no duplicates',
        'Videos are exact MPN-mapped YouTube links',
        'Images from brand TXT list, correct paths/extensions',
        'Department/Category matches MASTER or correction proposed',
        'Required Core Filter Attributes populated or escalated',
        'No Core duplicated in Comparison Attributes',
        'Configurable parent/child structure correct (titles, visibility, parent_sku)',
        'Only 2+ value attributes used as configurable selectors',
        'Apparel Gender follows fallback rule',
        'No new Magento attribute created without approval',
        'Product Title + H2 Title follow Correct Variation Names',
        'Variable optics use Min/Max; fixed use Magnification',
        'Attribute labels use NG canonical names',
        'Excel frozen header, filters enabled, 20px rows, opens cleanly'
      ]
    },
    custom_rules: {
      configurable_rules: {
        parent_title: 'General family-level, NO specific variant value',
        child_title: 'Includes exact distinguishing option value(s)',
        parent_description: 'Family-level copy. No child-specific MPN/UPC/weight/size.',
        child_description: 'Variant-specific copy. Additional Info must use exact child MPN/UPC/size/weight.',
        visibility: 'Parent = Catalog, Search. Children = Search.',
        parent_sku: 'Populated on every child SIMPLE row. Blank on configurable parent.',
        selector: 'Only when 2+ distinct values among child SKUs. One value = not a selector.',
        display_values: 'X-Small, Small, Medium, Large, X-Large, XX-Large, XXX-Large. "One Size Fits Most" → "One Size".',
        rules: [
          'Don\'t invent parent/child relationship not established from source',
          'Approved Configurable Attribute = permission, NOT requirement to configure',
          'Don\'t invent option value not established from source'
        ]
      },
      source_rules: {
        primary: 'Exact manufacturer URL from Column B + Night Galaxy control files',
        secondary: 'Historical/current Night Galaxy description if manufacturer link blank',
        rules: [
          'Don\'t search other websites unless explicitly authorized',
          'Don\'t invent missing facts if manufacturer link blank',
          'Complete manufacturer page review required',
          'Use only Night Galaxy control files as authority'
        ]
      },
      seo_rules: {
        meta_title: 'SEO-friendly, " - " before MPN, full size words',
        meta_keywords: 'Includes brand + SEO terms + platform compatibility + material + use-case',
        meta_description: 'Source-supported facts only. Human-first, search-friendly, natural language. No keyword stuffing.',
        rules: ['No generic AI marketing language', 'No invented attributes']
      },
      human_input_rules: {
        no: 'When all source data clearly mapped',
        yes: 'When any content can\'t be confidently mapped to exact MPN. Include precise explanation.',
        rules: [
          'Never blank when required Core Attribute unresolved',
          'Missing required Core value = YES + name the attribute',
          'Apparel Gender: missing + genuinely gender-neutral → Unisex (no Human Input needed)',
          'Apparel Gender: gender-specific ambiguity → YES'
        ]
      },
      column_mapping: {
        A: 'product_online', B: 'price', C: 'code (SKU)', D: 'qty', E: 'product_websites',
        F: 'Master_SKU', G: 'MPN (space format)', H: 'Parent_SKU', I: 'Var:Size', J: 'Var:Width',
        K: 'Product_type', L: 'VISIBLE', M: 'Brand', N: 'Title (hyphen MPN)', O: 'Description',
        P: 'Main_Image', Q: 'Additional_Images', R: 'UPC', S: 'cat_NG_LG', T: 'Weight',
        U: 'Color', V: 'Gender', W: 'Meta Title', X: 'Meta Keywords', Y: 'Meta Description'
      }
    }
  }
];

async function main() {
  // First, check if any published rulebooks already exist
  const { data: existing } = await supabase.from('rulebooks').select('id, project_id, version').eq('status', 'published');
  if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing published rulebooks, deleting...`);
    await supabase.from('rulebooks').delete().in('id', existing.map(r => r.id));
  }

  for (const rb of rulebooks) {
    const { data, error } = await supabase.from('rulebooks').insert({
      ...rb,
      published_at: new Date().toISOString()
    }).select('id, version').single();

    if (error) {
      console.log(`ERROR: ${error.message}`);
    } else {
      const projectName = Object.entries(PROJECT_IDS).find(([_, id]) => id === rb.project_id)?.[0];
      console.log(`✅ ${projectName} v${rb.version} — ID: ${data.id}`);
    }
  }

  // Verify
  const { data: all } = await supabase.from('rulebooks')
    .select('id, version, status, projects(name)')
    .eq('status', 'published');
  console.log(`\n=== ${all?.length || 0} PUBLISHED RULEBOOKS ===`);
  all?.forEach(r => console.log(`  ${r.projects?.name} v${r.version}`));
}

main().catch(console.error);