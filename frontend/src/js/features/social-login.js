// Social Login Buttons Component
// Add to login.html and register.html

const SocialLogin = {
    isGoogleOriginAllowed() {
        // Google OAuth must explicitly whitelist the current origin in Google Cloud Console.
        const currentOrigin = window.location.origin;
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3601',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3601'
        ];
        return allowedOrigins.includes(currentOrigin);
    },

    async init() {
        await this.addSocialButtons();
        this.handleSocialCallback(); // for legacy or facebook redirects
    },

    async fetchGoogleConfig() {
        try {
            // Priority: Global var > Placeholder ID Check > Fallback direct URL
            const baseUrl = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';
            console.log('Social Login: Fetching config from', baseUrl);
            
            const res = await fetch(`${baseUrl}/auth/google/config`, {
                cache: 'no-store' // Avoid stale config
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.clientId && !data.clientId.includes('your_google_client') && data.clientId.length > 10) {
                    console.log('Social Login: Client ID validated');
                    return data.clientId;
                } else {
                    console.warn('Social Login: Invalid Client ID received from backend');
                }
            } else {
                console.error('Social Login: Backend returned status', res.status);
            }
        } catch (e) {
            console.error('Social Login: Fetch error:', e.message);
        }
        return null;
    },

    async addSocialButtons() {
        // Find suitable form to attach to
        const loginForm = document.querySelector('#signin-form') || 
                         document.querySelector('#login-form') ||
                         document.querySelector('#register-form') ||
                         document.querySelector('form[action*="login"]') || 
                         document.querySelector('form[action*="register"]') ||
                         document.querySelector('form');
        
        if (!loginForm) {
            console.warn('Social Login: No form found to attach social login buttons');
            return;
        }

        // Avoid duplicate containers
        if (document.getElementById('google-btn-container')) return;

        const clientId = await this.fetchGoogleConfig();

        const socialHTML = `
            <div class="social-login-section mt-6" id="social-login-section">
                <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-white/10"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-4 bg-gray-900 text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Or continue with</span>
                    </div>
                </div>

                <div class="mt-6 flex justify-center">
                    <div id="google-btn-container" class="w-full h-[50px] overflow-hidden rounded-2xl flex justify-center">
                        <!-- Google button will render here -->
                        ${!clientId ? '<div class="text-[10px] text-orange-500/70 text-center mt-3 font-black uppercase tracking-widest">Connection Link Offline</div>' : ''}
                    </div>
                </div>
            </div>
        `;

        loginForm.insertAdjacentHTML('afterend', socialHTML);
        
        if (clientId && this.isGoogleOriginAllowed()) {
            this.initGoogleIdentity(clientId);
        } else if (clientId && !this.isGoogleOriginAllowed()) {
            const container = document.getElementById('google-btn-container');
            if (container) {
                container.innerHTML = '<div class="text-[10px] text-orange-500/70 text-center mt-3 font-black uppercase tracking-widest">Google login disabled: authorize this origin in Google Console</div>';
            }
        } else {
            // Attempt retry after 3 seconds if first one failed (server might be starting)
            setTimeout(async () => {
                const retryId = await this.fetchGoogleConfig();
                if (retryId && this.isGoogleOriginAllowed()) {
                    const errorMsg = document.querySelector('#google-btn-container div');
                    if (errorMsg) errorMsg.remove();
                    this.initGoogleIdentity(retryId);
                }
            }, 3000);
        }
    },

    initGoogleIdentity(clientId) {
        if (!document.getElementById('gsi-script')) {
            const script = document.createElement('script');
            script.id = 'gsi-script';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => this.renderGoogleButton(clientId);
            document.head.appendChild(script);
        } else if (window.google) {
            this.renderGoogleButton(clientId);
        }
    },

    renderGoogleButton(clientId) {
        if (!window.google || !window.google.accounts || !window.google.accounts.id) return;

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: this.handleGoogleResponse.bind(this)
        });

        const container = document.getElementById('google-btn-container');
        if (container) {
            window.google.accounts.id.renderButton(
                container,
                { theme: 'filled_black', size: 'large', type: 'standard', shape: 'pill', text: 'signin_with', width: container.offsetWidth } 
            );
        }
    },

    async handleGoogleResponse(response) {
        try {
            const baseUrl = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';
            const res = await fetch(`${baseUrl}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: response.credential })
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || 'Verification Failed');
            }

            if (data.twoFactorRequired) {
                window.showMessage?.('info', '2-Step Verification Active. Check Email.');
                // Simulate updating UI state for 2FA by reloading with params, 
                // or if updateUIForState is available in global scope:
                if (typeof window.updateUIForState === 'function') {
                    window.userEmail = data.email;
                    window.updateUIForState('2fa');
                } else {
                    window.location.href = `/pages/login.html?twoFactorRequired=true&email=${encodeURIComponent(data.email)}`;
                }
            } else {
                this.finalizeLogin(data);
            }
        } catch (err) {
            console.error(err);
            window.showMessage?.('error', err.message);
        }
    },

    finalizeLogin(data) {
        window.showMessage?.('success', 'Link Established. Finalizing Sync...');
        localStorage.setItem('tt_token', data.token);
        localStorage.setItem('tt_user', JSON.stringify(data.user || {
             id: data.id, name: data.name, email: data.email, role: data.role
        }));
        setTimeout(() => {
            window.location.href = (data.role === 'admin' || (data.user && data.user.isAdmin) || data.role === 'manager') 
                ? '/admin/dashboard.html' 
                : '/index.html';
        }, 1200);
    },

    // Handle callback from legacy social login redirects
    handleSocialCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const social = urlParams.get('social');
        const success = urlParams.get('success');

        if (success === 'true' && token) {
            localStorage.setItem('tt_token', token);
            window.showMessage?.(`Successfully logged in with ${social}!`, 'success');
            
            setTimeout(() => {
                window.location.href = '/pages/dashboard.html';
            }, 1000);
        }
    }
};

window.SocialLogin = SocialLogin;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        SocialLogin.init();
    });
} else {
    SocialLogin.init();
}
