(function () {
  'use strict';

  const ENDPOINT = 'https://crm.ulizarzana.com/api/aplicacoes/mentoria-entre-potencial-e-resultado';
  const PRIVACY_NOTE = 'Não enviamos suas respostas antes da etapa final.';
  const totalSteps = 8;
  let currentStep = 0;
  let submitting = false;
  let lastErrors = {};

  const state = {
    full_name: '',
    whatsapp: '',
    email: '',
    city_state: '',
    birth_date: '',
    discovery_source: '',
    discovery_source_other: '',
    professional_situation: '',
    motivation: '',
    desired_result: '',
    main_obstacle: '',
    preferred_format: '',
    previous_mentoring_experience: '',
    expectations: '',
    selection_reason: '',
    additional_information: '',
    financial_availability: '',
    preferred_session_period: '',
    schedule_notes: '',
    commitment_level: '',
    terms_accepted: false,
  };

  const content = document.querySelector('[data-application-content]');
  const form = document.querySelector('#application-form');
  const message = document.querySelector('[data-application-message]');
  const progress = document.querySelector('[data-application-progress]');
  const progressText = document.querySelector('[data-application-progress-text]');
  const progressTrack = document.querySelector('.progress-track');

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function value(name) { return escapeHtml(state[name] || ''); }

  function errorFor(name) {
    return lastErrors[name] ? `<p class="error-message" id="${name}-error">${escapeHtml(lastErrors[name])}</p>` : '';
  }

  function field(name, label, options) {
    const type = options.type || 'text';
    const input = type === 'textarea'
      ? `<textarea id="${name}" name="${name}" rows="5" maxlength="${options.maxlength || 2000}"${options.required ? ' required' : ''}${lastErrors[name] ? ' aria-invalid="true"' : ''} aria-describedby="${name}-help ${name}-error">${value(name)}</textarea>`
      : `<input id="${name}" name="${name}" type="${type}" value="${value(name)}"${options.placeholder ? ` placeholder="${escapeHtml(options.placeholder)}"` : ''}${options.maxlength ? ` maxlength="${options.maxlength}"` : ''}${options.required ? ' required' : ''}${options.autocomplete ? ` autocomplete="${options.autocomplete}"` : ''}${options.max ? ` max="${options.max}"` : ''}${lastErrors[name] ? ' aria-invalid="true"' : ''} aria-describedby="${name}-help ${name}-error">`;
    return `<div class="field${options.wide ? ' field--wide' : ''}"><label for="${name}">${label}${options.required ? ' <span aria-hidden="true">*</span>' : ''}</label>${input}<small id="${name}-help">${escapeHtml(options.help || '')}</small>${errorFor(name)}</div>`;
  }

  function choices(name, legend, items, options) {
    const type = options.type || 'radio';
    const inputName = type === 'checkbox' ? `${name}` : name;
    const choicesHtml = items.map((item) => {
      const checked = type === 'checkbox' ? state[name] === true : state[name] === item.value;
      return `<label class="choice"><input type="${type}" name="${inputName}" value="${escapeHtml(item.value)}"${checked ? ' checked' : ''}${type === 'checkbox' ? ' required' : ''}><span>${escapeHtml(item.label)}</span></label>`;
    }).join('');
    return `<fieldset class="fieldset"><legend>${legend}${options.required ? ' <span aria-hidden="true">*</span>' : ''}</legend><div class="choice-grid">${choicesHtml}</div>${errorFor(name)}</fieldset>`;
  }

  function stepHeading(eyebrow, title, description) {
    return `<div class="step-heading"><span class="eyebrow">${eyebrow}</span><h2 id="application-step-title" tabindex="-1">${title}</h2><p>${description}</p></div>`;
  }

  function actions(previous, label) {
    return `<div class="form-actions">${previous ? '<button class="button button--secondary" type="button" data-action="previous">Voltar</button>' : '<span></span>'}<button class="button button--primary" type="button" data-action="next">${label || 'Avançar'} <span class="button__arrow" aria-hidden="true">→</span></button></div>`;
  }

  function renderStep() {
    const stepMarkup = [
      () => `${stepHeading('ORIENTAÇÃO', 'A sua próxima transformação começa com clareza.', 'A Mentoria Entre Potencial e Resultado não é para todas as pessoas.')}
        <div class="intro-copy"><p>Ela foi criada para quem já percebeu que possui mais potencial do que os resultados que está vivendo hoje e está disposto a assumir responsabilidade pela própria transformação.</p><p>O preenchimento desta aplicação não garante sua participação. Cada inscrição será analisada individualmente, e as vagas serão destinadas a quem demonstrar clareza de objetivos, comprometimento e disposição para implementar mudanças reais.</p><p>Se você está buscando apenas informação, este talvez não seja o momento. Mas, se está buscando transformação, seja bem-vindo(a).</p><p class="field-help">${PRIVACY_NOTE}</p><p class="signature">Um abraço,<br>Uli Zarzana</p></div>${actions(false, 'Começar aplicação')}`,
      () => `${stepHeading('SOBRE VOCÊ', 'Vamos começar pelo essencial.', 'Esses dados nos ajudam a reconhecer você e a entender de onde parte esta conversa.')}
        <div class="field-grid">${field('full_name', 'Nome completo', { required: true, autocomplete: 'name', maxlength: 120 })}${field('whatsapp', 'WhatsApp', { required: true, type: 'tel', autocomplete: 'tel', maxlength: 40, help: 'Com DDD.' })}${field('email', 'E-mail', { required: true, type: 'email', autocomplete: 'email', maxlength: 254 })}${field('city_state', 'Cidade/Estado', { required: true, autocomplete: 'address-level2', maxlength: 120 })}${field('birth_date', 'Data de nascimento', { required: true, type: 'date', autocomplete: 'bday', max: new Date().toISOString().slice(0, 10) })}</div>
        ${choices('discovery_source', 'Como você conheceu a mentoria?', [{ value: 'instagram', label: 'Instagram' }, { value: 'aula_gratuita', label: 'Aula gratuita' }, { value: 'indicacao', label: 'Indicação' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'linkedin', label: 'LinkedIn' }, { value: 'outro', label: 'Outro' }], { required: true })}
        ${state.discovery_source === 'outro' ? `<div class="field-grid field-grid--single">${field('discovery_source_other', 'Conte como conheceu', { required: true, maxlength: 120 })}</div>` : ''}${actions(true)}`,
      () => `${stepHeading('SEU MOMENTO', 'Onde você está agora?', 'Conte o contexto profissional que dá sentido ao seu desejo de avançar.')}
        <div class="field-grid field-grid--single">${field('professional_situation', 'Situação profissional atual', { type: 'textarea', required: true, maxlength: 2000, help: 'Descreva brevemente seu cargo ou atividade, setor e momento profissional.' })}</div>${actions(true)}`,
      () => `${stepHeading('SUA DIREÇÃO', 'O que você quer tornar possível?', 'Um objetivo específico nos próximos meses nos ajuda a avaliar se a mentoria é o próximo passo adequado para você.')}
        <div class="field-grid field-grid--single">${field('motivation', 'Por que você está interessado(a) em receber mentoria neste momento?', { type: 'textarea', required: true, maxlength: 2000 })}${field('desired_result', 'Qual resultado profissional específico você deseja alcançar nos próximos 6 a 12 meses?', { type: 'textarea', required: true, maxlength: 2000 })}</div>${actions(true)}`,
      () => `${stepHeading('SEU DESAFIO', 'O que precisa mudar para você avançar?', 'Nomear o obstáculo e o formato de apoio desejado torna a conversa mais honesta e objetiva.')}
        <div class="field-grid field-grid--single">${field('main_obstacle', 'Qual é hoje o principal obstáculo que está impedindo você de acessar seu próximo nível?', { type: 'textarea', required: true, maxlength: 2000 })}</div>
        ${choices('preferred_format', 'Qual formato de mentoria desperta mais o seu interesse?', [{ value: 'individual', label: 'Mentoria individual' }, { value: 'grupo', label: 'Mentoria em grupo' }, { value: 'orientacao', label: 'Ainda não sei; gostaria de orientação' }], { required: true })}
        <div class="field-grid field-grid--single">${field('previous_mentoring_experience', 'Você possui uma experiência prévia com mentoria? Se sim, descreva brevemente.', { type: 'textarea', maxlength: 2000, required: false })}</div>${actions(true)}`,
      () => `${stepHeading('SUA EXPECTATIVA', 'Que transformação você está disposto(a) a construir?', 'As respostas desta etapa ajudam a identificar intenção, maturidade e disposição para implementar mudanças reais.')}
        <div class="field-grid field-grid--single">${field('expectations', 'Quais são suas expectativas em relação à mentoria?', { type: 'textarea', required: true, maxlength: 2000 })}${field('selection_reason', 'Dentre todas as pessoas que estão aplicando, por que você deveria ser selecionado(a)?', { type: 'textarea', required: true, maxlength: 2000 })}${field('additional_information', 'Há mais alguma informação que você gostaria de compartilhar sobre você?', { type: 'textarea', maxlength: 2000, required: false })}</div>${actions(true)}`,
      () => `${stepHeading('SUA DISPONIBILIDADE', 'Transformação também pede espaço.', 'Agora, vamos entender as condições práticas para que essa decisão possa acontecer.')}
        ${choices('financial_availability', 'Você possui disponibilidade financeira para investir em seu desenvolvimento pessoal e profissional neste momento?', [{ value: 'sim', label: 'Sim' }, { value: 'talvez', label: 'Talvez' }, { value: 'nao', label: 'Não' }], { required: true })}
        ${choices('preferred_session_period', 'Qual seria o melhor horário para a sua sessão de mentoria?', [{ value: 'manha', label: 'Manhã' }, { value: 'tarde', label: 'Tarde' }, { value: 'noite', label: 'Noite' }], { required: true })}
        <div class="field-grid field-grid--single">${field('schedule_notes', 'Alguma consideração específica sobre horário?', { type: 'textarea', maxlength: 1000, required: false })}</div>
        ${choices('commitment_level', 'Em uma escala de 0 a 10, qual é o seu nível de comprometimento para implementar mudanças nos próximos 6 meses?', [{ value: '0-3', label: '0–3' }, { value: '4-6', label: '4–6' }, { value: '7-8', label: '7–8' }, { value: '9-10', label: '9–10' }], { required: true })}${actions(true)}`,
      () => `${stepHeading('ÚLTIMA ETAPA', 'Revise antes de enviar.', 'Sua aplicação será analisada individualmente. O envio não garante a participação na mentoria.')}
        <div class="terms-box"><p><strong>Termos e condições</strong><br>Ao preencher esta aplicação, você declara que as informações fornecidas são verdadeiras e compreende que a aprovação para a mentoria será realizada com base na análise individual de cada aplicação.</p><label class="terms-check"><input type="checkbox" name="terms_accepted" value="true"${state.terms_accepted ? ' checked' : ''} required><span>Concordo com os termos e condições acima.</span></label>${errorFor('terms_accepted')}</div>
        <div class="form-actions"><button class="button button--secondary" type="button" data-action="previous">Voltar</button><button class="button button--primary button--submit" type="button" data-action="submit">Enviar aplicação <span class="button__arrow" aria-hidden="true">→</span></button></div>`,
    ][currentStep];

    content.innerHTML = stepMarkup();
    progress.style.width = `${((currentStep + 1) / totalSteps) * 100}%`;
    progressText.textContent = `Etapa ${currentStep + 1} de ${totalSteps}`;
    progressTrack.setAttribute('aria-valuenow', String(currentStep + 1));
    message.textContent = '';
    message.removeAttribute('data-state');
    const heading = document.querySelector('#application-step-title');
    if (heading) heading.focus({ preventScroll: true });
  }

  function setMessage(text, stateName) {
    message.textContent = text;
    if (stateName) message.dataset.state = stateName;
    else message.removeAttribute('data-state');
  }

  function validateStep(step) {
    lastErrors = {};
    const requiredByStep = {
      1: ['full_name', 'whatsapp', 'email', 'city_state', 'birth_date', 'discovery_source'],
      2: ['professional_situation'],
      3: ['motivation', 'desired_result'],
      4: ['main_obstacle', 'preferred_format'],
      5: ['expectations', 'selection_reason'],
      6: ['financial_availability', 'preferred_session_period', 'commitment_level'],
      7: ['terms_accepted'],
    };
    (requiredByStep[step] || []).forEach((name) => {
      const current = state[name];
      if ((typeof current === 'boolean' && !current) || (typeof current !== 'boolean' && !String(current || '').trim())) {
        lastErrors[name] = name === 'terms_accepted' ? 'É necessário concordar com os termos.' : 'Preencha este campo.';
      }
    });
    if (state.discovery_source === 'outro' && !state.discovery_source_other.trim()) lastErrors.discovery_source_other = 'Conte como conheceu a mentoria.';
    if (state.email && !/^\S+@\S+\.\S+$/.test(state.email)) lastErrors.email = 'Informe um e-mail válido.';
    if (state.whatsapp && state.whatsapp.replace(/\D/g, '').length < 8) lastErrors.whatsapp = 'Informe um WhatsApp válido.';
    if (state.birth_date && state.birth_date > new Date().toISOString().slice(0, 10)) lastErrors.birth_date = 'Informe uma data válida.';
    return Object.keys(lastErrors).length === 0;
  }

  function validateAll() {
    for (let step = 1; step < totalSteps; step += 1) {
      if (!validateStep(step)) return false;
    }
    return true;
  }

  function firstInvalidStep() {
    for (let step = 1; step < totalSteps; step += 1) {
      if (!validateStep(step)) return step;
    }
    return -1;
  }

  function collectInput(target) {
    if (!target || !target.name) return;
    state[target.name] = target.type === 'checkbox' ? target.checked : target.value;
  }

  async function submitApplication() {
    if (submitting) return;
    const invalidStep = firstInvalidStep();
    if (invalidStep >= 0) {
      currentStep = invalidStep;
      renderStep();
      setMessage('Revise os campos destacados antes de enviar.', 'error');
      return;
    }
    submitting = true;
    const submitButton = document.querySelector('[data-action="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Enviando…'; }
    setMessage('Enviando sua aplicação…');
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (Array.isArray(result.errors)) result.errors.forEach((item) => { lastErrors[item.field] = item.message; });
        throw new Error(result.message || 'Não foi possível enviar a aplicação agora.');
      }
      document.querySelector('.application-panel__topline').innerHTML = '<span class="eyebrow">APLICAÇÃO RECEBIDA</span><span>Obrigada pela confiança</span>';
      content.innerHTML = '<div class="success-state"><span class="success-mark" aria-hidden="true">✓</span><span class="eyebrow">PRÓXIMO PASSO</span><h2>Recebemos sua aplicação.</h2><p>Suas respostas serão analisadas individualmente. Caso o seu momento esteja alinhado à mentoria, Uli Zarzana entrará em contato com você pelos dados informados.</p></div>';
      message.textContent = '';
    } catch (error) {
      submitting = false;
      if (Object.keys(lastErrors).length) renderStep();
      setMessage(error.message || 'Não foi possível enviar a aplicação agora. Tente novamente.', 'error');
      const currentButton = document.querySelector('[data-action="submit"]');
      if (currentButton) currentButton.disabled = false;
    }
  }

  form.addEventListener('input', (event) => collectInput(event.target));
  form.addEventListener('change', (event) => {
    collectInput(event.target);
    if (event.target.name === 'discovery_source') renderStep();
  });
  form.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'previous') { currentStep = Math.max(0, currentStep - 1); lastErrors = {}; renderStep(); }
    if (action === 'next') {
      if (!validateStep(currentStep)) { renderStep(); setMessage('Revise os campos destacados para continuar.', 'error'); return; }
      currentStep = Math.min(totalSteps - 1, currentStep + 1); lastErrors = {}; renderStep();
    }
    if (action === 'submit') submitApplication();
  });

  renderStep();
}());
