const form = document.querySelector('#generatorForm');
const countryInput = document.querySelector('#country');
const genderInput = document.querySelector('#gender');
const quantityInput = document.querySelector('#quantity');
const instructionsInput = document.querySelector('#instructions');
const generateButton = document.querySelector('#generateButton');
const formError = document.querySelector('#formError');
const profileList = document.querySelector('#profileList');
const emptyState = document.querySelector('#emptyState');
const resultsToolbar = document.querySelector('#resultsToolbar');
const profileCount = document.querySelector('#profileCount');
const statusText = document.querySelector('#statusText');
const statusState = document.querySelector('#statusState');
const connectionStatus = document.querySelector('#connectionStatus');
const characterCount = document.querySelector('#characterCount');
const toast = document.querySelector('#toast');
let profiles = [];
let lastRequest = null;

instructionsInput.addEventListener('input', () => { characterCount.textContent = instructionsInput.value.length; });
form.addEventListener('submit', async (event) => {
	event.preventDefault();
	const request = { country: countryInput.value, gender: genderInput.value, quantity: Number(quantityInput.value), instructions: instructionsInput.value.trim() };
	if (!Number.isInteger(request.quantity) || request.quantity < 1 || request.quantity > 10) return showError('Choose between 1 and 10 profiles.');
	lastRequest = request;
	setLoading(true);
	try {
		const { country, gender, quantity, instructions } = request;
		const response = await fetch('/api/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ country, gender, quantity, instructions })
		});
		const result = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(result.error || `Request failed with status ${response.status}`);
		if (!Array.isArray(result.profiles) || result.profiles.length === 0) throw new Error('The AI returned an empty response. Please try again.');
		profiles = result.profiles;
		renderProfiles();
		setStatus('Ready');
	} catch (error) {
		setStatus('Connection Error');
		showError(error.message.includes('Failed to fetch') ? 'Network failure. Please check your connection and try again.' : error.message);
	} finally { setLoading(false); }
});

function setLoading(loading) {
	generateButton.disabled = loading;
	generateButton.classList.toggle('is-loading', loading);
	generateButton.querySelector('.button-label').textContent = loading ? 'Generating...' : 'Generate with Gemini';
	if (loading) { formError.classList.remove('visible'); setStatus('Generating'); }
}
function setStatus(state) { statusState.textContent = state; statusText.textContent = state === 'Connection Error' ? 'Gemini AI' : 'Gemini AI Connected'; connectionStatus.classList.toggle('error', state === 'Connection Error'); }
function showError(message) { formError.textContent = message || 'Unable to generate profiles right now. Please try again.'; formError.classList.add('visible'); }
function renderProfiles() {
	emptyState.classList.add('hidden'); resultsToolbar.classList.remove('hidden'); profileCount.textContent = `${profiles.length} profile${profiles.length === 1 ? '' : 's'}`;
	profileList.innerHTML = profiles.map((profile, index) => `<article class="profile-card"><div class="profile-head"><div class="profile-avatar">${escapeHtml(initials(profile.fullName))}</div><div class="profile-meta"><span class="profile-number">PROFILE / ${String(index + 1).padStart(3, '0')}</span><strong class="profile-name">${escapeHtml(profile.fullName)}</strong></div><span class="profile-country">${escapeHtml(profile.country)}</span></div><div class="profile-fields">${dataPoint('Gender', profile.gender)}${dataPoint('Fictional email', profile.email)}${dataPoint('Fictional phone', profile.phone)}${dataPoint('Fictional address', profile.address)}${dataPoint('City', profile.city)}${dataPoint('State / region', profile.state)}${dataPoint('Postal code', profile.postalCode)}${dataPoint('Date of birth', profile.dateOfBirth)}${dataPoint('Username', profile.username)}${dataPoint('Job title', profile.jobTitle)}${dataPoint('Company', profile.company)}</div><div class="profile-actions"><button type="button" data-action="profile" data-index="${index}">Copy Profile</button><button type="button" data-action="email" data-index="${index}">Copy Email</button><button type="button" data-action="json" data-index="${index}">Copy JSON</button></div></article>`).join('');
}
function dataPoint(label, value) { return `<div class="data-point"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || 'Not provided')}</strong></div>`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function initials(name) { return String(name || 'FD').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'FD'; }
function profileText(profile) { return Object.entries(profile).map(([key, value]) => `${key}: ${value}`).join('\n'); }
async function copyText(text, message = 'Copied to clipboard.') { try { await navigator.clipboard.writeText(text); showToast(message); } catch { showToast('Copy is unavailable in this browser.'); } }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200); }

profileList.addEventListener('click', event => { const button = event.target.closest('button[data-action]'); if (!button) return; const profile = profiles[Number(button.dataset.index)]; if (!profile) return; const action = button.dataset.action; copyText(action === 'email' ? profile.email : action === 'json' ? JSON.stringify(profile, null, 2) : profileText(profile)); });
document.querySelector('#copyAllButton').addEventListener('click', () => copyText(JSON.stringify({ profiles }, null, 2), 'All profiles copied.'));
document.querySelector('#downloadButton').addEventListener('click', () => { const blob = new Blob([JSON.stringify({ profiles }, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'fakeforge-profiles.json'; link.click(); URL.revokeObjectURL(link.href); showToast('JSON download started.'); });
document.querySelector('#againButton').addEventListener('click', () => { if (lastRequest) form.requestSubmit(); else form.scrollIntoView({ behavior: 'smooth' }); });
document.querySelector('#clearButton').addEventListener('click', () => { profiles = []; profileList.replaceChildren(); resultsToolbar.classList.add('hidden'); emptyState.classList.remove('hidden'); showToast('Results cleared.'); });
