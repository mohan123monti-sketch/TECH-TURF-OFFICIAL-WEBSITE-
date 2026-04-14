/**
 * Tech Turf Homepage - Digital Ecosystem 3D Core
 * Theme: "Digital Earth / Neural Network"
 * Colors: Tech Blue (#0B3C8C), Ignite Orange (#F26522)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only run on homepage
    if (!document.body.classList.contains('homepage-branding')) return;

    const container = document.getElementById('three-container');
    if (!container) return;

    container.innerHTML = '';

    container.innerHTML = '';

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x0B3C8C, 2, 10);
    pointLight.position.set(2, 2, 2);
    scene.add(pointLight);

    const accentLight = new THREE.PointLight(0xF26522, 1.5, 10);
    accentLight.position.set(-2, -1, 2);
    scene.add(accentLight);

    // --- DIGITAL PLANET (CORE) ---
    const planetGroup = new THREE.Group();
    scene.add(planetGroup);

    const geometry = new THREE.IcosahedronGeometry(1.2, 5);
    const material = new THREE.MeshPhongMaterial({
        color: 0x051a3a,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
        emissive: 0x0B3C8C,
        emissiveIntensity: 0.5
    });
    const core = new THREE.Mesh(geometry, material);
    planetGroup.add(core);

    // --- DATA NODES (PARTICLES) ---
    const particlesCount = 800;
    const particlesGeometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(particlesCount * 3);
    const colorsArray = new Float32Array(particlesCount * 3);

    const blue = new THREE.Color(0x0B3C8C);
    const orange = new THREE.Color(0xF26522);

    for (let i = 0; i < particlesCount * 3; i += 3) {
        // Sphere distribution
        const r = 1.3 + Math.random() * 0.1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        posArray[i] = r * Math.sin(phi) * Math.cos(theta);
        posArray[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        posArray[i + 2] = r * Math.cos(phi);

        // Mixed colors
        const mixedColor = blue.clone().lerp(orange, Math.random());
        colorsArray[i] = mixedColor.r;
        colorsArray[i + 1] = mixedColor.g;
        colorsArray[i + 2] = mixedColor.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.015,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const dataWaves = new THREE.Points(particlesGeometry, particlesMaterial);
    planetGroup.add(dataWaves);

    // --- NEURAL NETWORK (CONNECTIONS) ---
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x0B3C8C,
        transparent: true,
        opacity: 0.1
    });

    // Low-poly sphere for structural lines
    const sphereLines = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.2, 2)),
        lineMaterial
    );
    planetGroup.add(sphereLines);

    // --- STARFIELD ---
    const starCount = 2000;
    const starGeom = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        const r = 10 + Math.random() * 50;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
    });
    const stars = new THREE.Points(starGeom, starMaterial);
    scene.add(stars);
    // --- ANIMATION ---

    // --- ANIMATION ---
    function animate() {
        requestAnimationFrame(animate);

        // Core Rotation
        planetGroup.rotation.y += 0.002;
        planetGroup.rotation.x += 0.001;
        sphereLines.rotation.y -= 0.001;

        // Smooth Automatic Movement (Floating effect)
        const time = performance.now() * 0.001;
        const autoX = Math.sin(time * 0.5) * 0.2;
        const autoY = Math.cos(time * 0.3) * 0.2;

        planetGroup.position.x = autoX;
        planetGroup.position.y = autoY;

        // Stars slow drift
        stars.rotation.y -= 0.0001;

        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
});
