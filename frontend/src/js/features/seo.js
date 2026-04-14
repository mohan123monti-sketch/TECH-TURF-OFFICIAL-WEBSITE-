(function () {
    const origin = window.location.origin || '';
    const path = window.location.pathname || '/';
    const file = path.split('/').pop() || 'index.html';

    const defaults = {
        title: 'Tech Turf - Innovate, Inspire and Ignite',
        description: 'Tech Turf builds high-end digital ecosystems across aerospace, software, and growth marketing. Innovate, Inspire and Ignite.',
        keywords: 'Tech Turf, Quinta, Click Sphere, Trend Hive, Nexus AI, aerospace, software, marketing, ecommerce, innovation, digital ecosystem',
        type: 'website'
    };

    const pageMeta = {
        'index.html': {
            title: 'Tech Turf - High-End Digital Ecosystem',
            description: 'Tech Turf is a high-end digital ecosystem spanning aerospace, software, and growth systems. Innovate, Inspire and Ignite.',
            keywords: 'Tech Turf, digital ecosystem, innovation, aerospace, software, marketing'
        },
        'about.html': {
            title: 'About Tech Turf - Digital Architects',
            description: 'Meet the Tech Turf team and mission. We architect scalable digital ecosystems across industries.',
            keywords: 'Tech Turf about, mission, team, digital architects'
        },
        'products.html': {
            title: 'Tech Turf Products and Services',
            description: 'Explore the Tech Turf ecosystem of products and services across software, aerospace, and custom builds.',
            keywords: 'Tech Turf products, services, software, aerospace, projects'
        },
        'shopping.html': {
            title: 'Tech Turf Marketplace',
            description: 'Shop high-performance tech modules and innovation assets from Tech Turf divisions.',
            keywords: 'Tech Turf marketplace, products, ecommerce, technology'
        },
        'product_details.html': {
            title: 'Tech Turf Product Details',
            description: 'View detailed specifications and pricing for Tech Turf products.',
            keywords: 'Tech Turf product details, specifications, pricing',
            type: 'product'
        },
        'cart.html': {
            title: 'Tech Turf Cart',
            description: 'Review selected Tech Turf products and proceed to secure checkout.',
            keywords: 'Tech Turf cart, checkout, ecommerce'
        },
        'checkout.html': {
            title: 'Tech Turf Secure Checkout',
            description: 'Complete your Tech Turf order with secure checkout and shipping details.',
            keywords: 'Tech Turf checkout, secure payment, order'
        },
        'projects.html': {
            title: 'Tech Turf Projects',
            description: 'Explore selected Tech Turf projects across aerospace, software, and growth platforms.',
            keywords: 'Tech Turf projects, portfolio, innovation'
        },
        'contact.html': {
            title: 'Contact Tech Turf',
            description: 'Contact Tech Turf to start a new project or connect with our divisions.',
            keywords: 'Tech Turf contact, support, inquiry'
        },
        'quinta.html': {
            title: 'Quinta - Aerospace Division',
            description: 'Quinta is the Tech Turf aerospace division focused on propulsion, avionics, and flight systems.',
            keywords: 'Quinta, aerospace, propulsion, avionics, Tech Turf'
        },
        'click_sphere.html': {
            title: 'Click Sphere - Software Division',
            description: 'Click Sphere delivers full-stack software, digital products, and engineering services.',
            keywords: 'Click Sphere, software, full-stack, Tech Turf'
        },
        'trend_hive.html': {
            title: 'Trend Hive - Growth Division',
            description: 'Trend Hive drives branding, marketing, and high-velocity growth systems.',
            keywords: 'Trend Hive, marketing, branding, growth, Tech Turf'
        },
        'nexus_ai.html': {
            title: 'Nexus AI - Tech Turf Assistant',
            description: 'Nexus AI is the Tech Turf intelligent assistant for projects and system insights.',
            keywords: 'Nexus AI, Tech Turf assistant, AI'
        },
        'login.html': {
            title: 'Tech Turf Login',
            description: 'Secure login for Tech Turf users and administrators.',
            keywords: 'Tech Turf login, authentication'
        },
        'register.html': {
            title: 'Tech Turf Register',
            description: 'Create a Tech Turf account to access the ecosystem and dashboard.',
            keywords: 'Tech Turf register, sign up'
        },
        'account.html': {
            title: 'Tech Turf Account',
            description: 'Manage your Tech Turf profile and view order history.',
            keywords: 'Tech Turf account, profile'
        },
        'dashboard.html': {
            title: 'Tech Turf Dashboard',
            description: 'View your Tech Turf mission dashboard and recent orders.',
            keywords: 'Tech Turf dashboard, orders'
        },
        'orders.html': {
            title: 'Tech Turf Orders',
            description: 'Review your Tech Turf order history and mission logs.',
            keywords: 'Tech Turf orders, order history'
        },
        'privacy_policy.html': {
            title: 'Tech Turf Privacy Policy',
            description: 'Read the Tech Turf privacy policy and data protection practices.',
            keywords: 'Tech Turf privacy policy, data protection'
        },
        'terms_of_service.html': {
            title: 'Tech Turf Terms of Service',
            description: 'Read the Tech Turf terms of service and usage policies.',
            keywords: 'Tech Turf terms of service, legal'
        },
        '404.html': {
            title: 'Tech Turf - 404 Not Found',
            description: 'The requested Tech Turf page was not found.',
            keywords: 'Tech Turf 404'
        },
        '500.html': {
            title: 'Tech Turf - 500 Server Error',
            description: 'A system error occurred. Tech Turf is restoring service.',
            keywords: 'Tech Turf 500'
        }
    };

    function setMeta(attrName, attrValue, content) {
        if (!content) return;
        let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute(attrName, attrValue);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
    }

    function setLink(rel, href) {
        if (!href) return;
        let link = document.querySelector(`link[rel="${rel}"]`);
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', rel);
            document.head.appendChild(link);
        }
        link.setAttribute('href', href);
    }

    function applySEO() {
        const meta = Object.assign({}, defaults, pageMeta[file] || {});
        const canonical = `${origin}${path}`;
        const ogImage = `${origin}/assets/img/space-bg.png`;
        const isAdmin = path.indexOf('/admin/') !== -1;
        const noIndexPaths = ['login.html', 'register.html', 'account.html', 'dashboard.html', 'orders.html', 'checkout.html', 'cart.html', '404.html', '500.html'];
        const isNoIndex = isAdmin || noIndexPaths.includes(file);

        document.title = meta.title;
        setMeta('name', 'description', meta.description);
        setMeta('name', 'keywords', meta.keywords);
        setMeta('name', 'robots', isNoIndex ? 'noindex, nofollow' : 'index, follow');

        setMeta('property', 'og:title', meta.title);
        setMeta('property', 'og:description', meta.description);
        setMeta('property', 'og:type', meta.type || 'website');
        setMeta('property', 'og:url', canonical);
        setMeta('property', 'og:image', ogImage);
        setMeta('property', 'og:site_name', 'Tech Turf');

        setMeta('name', 'twitter:card', 'summary_large_image');
        setMeta('name', 'twitter:title', meta.title);
        setMeta('name', 'twitter:description', meta.description);
        setMeta('name', 'twitter:image', ogImage);

        setLink('canonical', canonical);

        const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Tech Turf',
            url: origin,
            description: defaults.description,
            image: ogImage,
            slogan: 'Innovate, Inspire and Ignite'
        };

        let jsonScript = document.getElementById('seo-jsonld');
        if (!jsonScript) {
            jsonScript = document.createElement('script');
            jsonScript.type = 'application/ld+json';
            jsonScript.id = 'seo-jsonld';
            document.head.appendChild(jsonScript);
        }
        jsonScript.textContent = JSON.stringify(jsonLd);
    }

    window.applySEO = applySEO;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySEO);
    } else {
        applySEO();
    }
})();
