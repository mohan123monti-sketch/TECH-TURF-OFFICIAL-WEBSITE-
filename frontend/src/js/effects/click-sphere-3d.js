/**
 * Click Sphere - Floating Smart Nodes Network
 * Theme: "Smart Technology / IoT / Digital Grid"
 * Concept: Floating connection nodes with thin neural lines.
 */

/**
 * Click Sphere - Floating Smart Nodes Network
 * Theme: "Smart Technology / IoT / Digital Grid"
 * Concept: Floating connection nodes with thin neural lines.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('click-sphere-branding')) return;

    const container = document.getElementById('three-container');
    if (!container) return;

    container.innerHTML = '';

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const greenLight = new THREE.PointLight(0x57C84D, 2, 50);
    greenLight.position.set(20, 10, 10);
    scene.add(greenLight);

    const accentLight = new THREE.PointLight(0xA3E635, 1.5, 40);
    accentLight.position.set(-15, -10, 15);
    scene.add(accentLight);

    // --- SMART NODES NETWORK ---
    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);

    const nodesCount = 60;
    const nodesPositions = [];
    const nodesVelocities = [];
    const nodeMeshes = [];

    const nodeGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const nodeMaterial = new THREE.MeshPhongMaterial({
        color: 0x57C84D,
        emissive: 0x57C84D,
        emissiveIntensity: 0.5,
        shininess: 100
    });

    for (let i = 0; i < nodesCount; i++) {
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);

        // Random Position
        node.position.x = (Math.random() - 0.5) * 40;
        node.position.y = (Math.random() - 0.5) * 40;
        node.position.z = (Math.random() - 0.5) * 20;

        nodesGroup.add(node);
        nodeMeshes.push(node);

        nodesVelocities.push({
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.01
        });
    }

    // --- CONNECTION LINES ---
    const maxDistance = 8;
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.15
    });

    let lineMesh;

    function updateConnections() {
        if (lineMesh) nodesGroup.remove(lineMesh);

        const pairs = [];
        for (let i = 0; i < nodesCount; i++) {
            for (let j = i + 1; j < nodesCount; j++) {
                const dist = nodeMeshes[i].position.distanceTo(nodeMeshes[j].position);
                if (dist < maxDistance) {
                    pairs.push(nodeMeshes[i].position.x, nodeMeshes[i].position.y, nodeMeshes[i].position.z);
                    pairs.push(nodeMeshes[j].position.x, nodeMeshes[j].position.y, nodeMeshes[j].position.z);
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(pairs, 3));
        lineMesh = new THREE.LineSegments(geometry, lineMaterial);
        nodesGroup.add(lineMesh);
    }

    // --- ANIMATION LOOP ---
    function animate() {
        requestAnimationFrame(animate);

        // Slow Drift
        for (let i = 0; i < nodesCount; i++) {
            const node = nodeMeshes[i];
            const vel = nodesVelocities[i];

            node.position.x += vel.x;
            node.position.y += vel.y;
            node.position.z += vel.z;

            // Boundary Wrap
            if (Math.abs(node.position.x) > 22) vel.x *= -1;
            if (Math.abs(node.position.y) > 22) vel.y *= -1;
            if (Math.abs(node.position.z) > 12) vel.z *= -1;
        }

        updateConnections();

        // Automatic Movement (Floating)
        const time = performance.now() * 0.001;
        nodesGroup.rotation.y += 0.0005;
        nodesGroup.position.x = Math.sin(time * 0.3) * 0.4;
        nodesGroup.position.y = Math.cos(time * 0.2) * 0.3;

        // Subtle glow fluctuation
        greenLight.intensity = 2 + Math.sin(Date.now() * 0.001) * 0.5;

        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
});
