import io, json, re

SITE = "https://tipsey-tech-solutions.onrender.com"
LOG = SITE + "/assets/logo-mark.png"
POSTER = SITE + "/assets/promo-poster.jpg"

BIZ = {
    "name": "Tipsey Tech Solutions",
    "telephone": "+44 7030 955722",
    "email": "lolfromthesky@gmail.com",
    # No physical premises - the business is fully remote, so a PostalAddress
    # would be fabricated. Locality/region are left off and areaServed is used
    # instead, which is the honest representation.
    "street": "",
    "region": "",
    "country": "GB",
    "founded": "2019",
    "priceRange": "\u00a3\u00a3",
}

PAGES = {
    "index.html": {
        "title": "Tipsey Tech Solutions | Web Design Agency for Small Businesses",
        "desc": "Tipsey Tech Solutions designs and builds fast, modern websites for small businesses. Custom web design, eCommerce, SEO and support. Free quote within 24 hours.",
        "crumb": "Home",
    },
    "services.html": {
        "title": "Web Design, eCommerce & SEO Services | Tipsey Tech Solutions",
        "desc": "Custom website design, online stores, SEO and care plans for small businesses. Fixed prices from \u00a31,490, no hourly surprises. See what every Tipsey website includes.",
        "crumb": "Services",
    },
    "work.html": {
        "title": "Our Work | Website Design Portfolio | Tipsey Tech Solutions",
        "desc": "Recent website projects from Tipsey Tech Solutions: cafes, trades, clinics and retailers. Real results including more online orders, enquiries and revenue.",
        "crumb": "Work",
    },
    "about.html": {
        "title": "About Tipsey Tech Solutions | Small Web Design Studio",
        "desc": "Tipsey Tech Solutions is a small, remote-first web studio building websites for growing businesses since 2019. Meet the team and see how we work.",
        "crumb": "About",
    },
    "contact.html": {
        "title": "Contact Tipsey Tech Solutions | Get a Free Website Quote",
        "desc": "Get a free quote for your website. Tell us about your project and we'll reply within one business day with a clear quote and timeline.",
        "crumb": "Contact",
    },
}

SERVICES = [
    "Custom Web Design",
    "Mobile-First Website Development",
    "SEO and Search Engine Optimisation",
    "Online Store and eCommerce Development",
    "Website Copywriting and Content",
    "Website Hosting, Care Plans and Maintenance",
]

FAQS = {
    "index.html": [
        ("How long does a website take?", "Most brochure sites launch in 2-3 weeks from kickoff. eCommerce builds typically take 4-6 weeks depending on catalogue size."),
        ("How much does a website cost?", "Fixed-price packages start at \u00a31,490. Growth packages are \u00a33,490 and eCommerce builds start at \u00a36,900."),
        ("Do you offer care plans after launch?", "Yes. Care plans from \u00a349 per month include hosting, updates, daily backups, security monitoring and content changes."),
    ],
    "services.html": [
        ("How long does a website take?", "Most brochure sites launch in 2-3 weeks from kickoff. eCommerce builds typically take 4-6 weeks."),
        ("Do I need to provide content?", "We can write it for you - copywriting is included in the Growth package. If you have photos and notes, great; if not, we'll source stock imagery."),
        ("Who owns the website?", "You do - 100%. Code, design, content, domain and accounts are all in your name from day one."),
    ],
    "contact.html": [
        ("Is the discovery call really free?", "Yes - completely free, with no obligation. It's a 30-minute conversation to see if we're a good fit."),
        ("How fast can you start?", "Most projects kick off within 1-2 weeks of signing. If you have a hard deadline, tell us in the form and we'll be honest about it."),
    ],
}

def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")

def page_url(page):
    # Homepage canonicalises to the bare domain so / and /index.html never compete.
    return SITE + "/" if page == "index.html" else SITE + "/" + page


def build_jsonld(page):
    url = page_url(page)
    org = {
        "@type": ["ProfessionalService", "LocalBusiness"],
        "@id": SITE + "/#business",
        "name": BIZ["name"],
        "description": "Web design agency building fast, modern, conversion-focused websites for small businesses.",
        "url": SITE + "/",
        "logo": LOG,
        "image": POSTER,
        "telephone": BIZ["telephone"],
        "email": BIZ["email"],
        "foundingDate": BIZ["founded"],
        "priceRange": BIZ["priceRange"],
        "areaServed": [
            {"@type": "Country", "name": "United Kingdom"},
        ],
        "knowsAbout": ["Web design", "eCommerce", "Search engine optimisation",
                       "Website maintenance", "Conversion rate optimisation", "Mobile web development"],
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Web design services",
            "itemListElement": [
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": s}} for s in SERVICES
            ],
        },
    }
    website = {
        "@type": "WebSite", "@id": SITE + "/#website",
        "url": SITE + "/", "name": BIZ["name"],
        "publisher": {"@id": SITE + "/#business"}, "inLanguage": "en-GB",
    }
    wp = {
        "@type": "WebPage", "@id": url + "#webpage", "url": url,
        "name": PAGES[page]["title"], "description": PAGES[page]["desc"],
        "isPartOf": {"@id": SITE + "/#website"},
        "about": {"@id": SITE + "/#business"},
        "inLanguage": "en-GB",
    }
    g = {"@context": "https://schema.org", "@graph": [org, website, wp]}
    if page in FAQS:
        g["@graph"].append({
            "@type": "FAQPage", "@id": url + "#faq",
            "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                for q, a in FAQS[page]
            ],
        })
    return g

def head_block(page):
    m = PAGES[page]
    title, desc = esc(m["title"]), esc(m["desc"])
    url = page_url(page)
    jsonld = json.dumps(build_jsonld(page), indent=2)
    return (
'  <title>' + title + '</title>\n'
'  <meta name="description" content="' + desc + '" />\n'
'  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />\n'
'  <link rel="canonical" href="' + url + '" />\n\n'
'  <meta property="og:type" content="website" />\n'
'  <meta property="og:site_name" content="Tipsey Tech Solutions" />\n'
'  <meta property="og:locale" content="en_GB" />\n'
'  <meta property="og:url" content="' + url + '" />\n'
'  <meta property="og:title" content="' + title + '" />\n'
'  <meta property="og:description" content="' + desc + '" />\n'
'  <meta property="og:image" content="' + POSTER + '" />\n'
'  <meta property="og:image:alt" content="Tipsey Tech Solutions - we build websites that build your business" />\n'
'  <meta name="twitter:card" content="summary_large_image" />\n'
'  <meta name="twitter:title" content="' + title + '" />\n'
'  <meta name="twitter:description" content="' + desc + '" />\n'
'  <meta name="twitter:image" content="' + POSTER + '" />\n\n'
'  <script type="application/ld+json">\n' + jsonld + '\n  </script>'
    )

# Matches any head block this script has already written (it always ends with
# the JSON-LD </script>), so re-running replaces rather than duplicates tags.
INJECTED = re.compile(r'[ \t]*<title>.*?</script>[ \t]*\n+(?=[ \t]*<link rel="preconnect")', re.S)
ANCHOR = re.compile(r'(?=[ \t]*<link rel="preconnect")')

for page, meta in PAGES.items():
    html = io.open(page, encoding="utf-8").read()
    html = INJECTED.sub("", html)
    html = ANCHOR.sub(lambda _m: head_block(page) + "\n\n", html, count=1)
    html = html.replace(
        '<nav class="crumbs reveal"><a href="index.html">Home</a><span>/</span><span>' + meta["crumb"] + '</span></nav>',
        '<nav class="crumbs reveal" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><span aria-current="page">' + meta["crumb"] + '</span></nav>')
    io.open(page, "w", encoding="utf-8").write(html)
    print("%-15s canonical=%s jsonld=%s crumbs=%s" % (
        page, 'rel="canonical"' in html, "application/ld+json" in html, 'aria-current="page"' in html))
