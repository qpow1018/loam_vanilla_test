import { api, snackbar, modal, utils, data } from '/lib/stdlib.js';
import Drag from '/modules/drag.js';

const $loading = document.querySelector('#loading');
const $myCharacterList = document.querySelector('#my-character-list');
const $characterNicknameInput = document.querySelector('#character-nickname-input');
const $addCharacterBtn = document.querySelector('#add-character-btn');
const $deleteModalCloseBtnInHeader = document.querySelector('#delete-my-character-modal .modal-title-panel .modal-close-btn');
const $deleteModalCloseBtnInContent = document.querySelector('#delete-my-character-modal .modal-content-action-box .modal-close-btn');
const $deleteCharacterBtn = document.querySelector('#delete-my-character-modal .modal-content-action-box .delete-character-btn');

// 사용할 로딩 엘리먼트 추가
utils.addLoadingElement($loading, 'fixed');

// Draggable 추가
const drag = new Drag();
drag.setupOptions({
  containerElm: $myCharacterList,
  handleElmClassName: 'character-item-drag-handle',
  direction: 'y',
  onChange: handleChangeCharacterOrder
});
drag.init();

function handleChangeCharacterOrder() {
  const myCharacters = data.getMyCharacters();
  const newList = [];

  document.querySelectorAll('.character-item').forEach(item => {
    const nickname = item.getAttribute('data-nickname');
    const data = myCharacters.find(item => item.nickname === nickname);
    if (data === undefined) {
      throw new Error('myCharacters data is undefined');
    }
    newList.push(data);
  });

  data.setMyCharacters(newList);
}

// 리스트 출력
showMyCharacterList();

function showMyCharacterList() {
  const _myCharacters = data.getMyCharacters();
  _myCharacters.forEach(item => {
    addMyCharacterRowElement(item.nickname, item.classname, item.level);
  });
}

function addMyCharacterRowElement(nickname, classname, level) {
  const $mainElm = document.createElement('div');
  $mainElm.classList.add('character-item');

  $mainElm.setAttribute('data-nickname', nickname);

  // event가 없는 element라서 insertAdjacentHTML 사용
  $mainElm.insertAdjacentHTML(
    'afterbegin',
    `
      <a class="character-info-panel" href="/character-info.html?nickname=${nickname}">
        <div class="character-level">${utils.getLevelInteger(level)}</div>
        <div class="character-nickname-panel">
          <div class="character-class">${classname}</div>
          <div class="character-nickname">${nickname}</div>
        </div>
      </a>
    `
  );

  // event가 있는 element라서 createElement 사용
  const $actionPanelElm = document.createElement('div');
  $actionPanelElm.classList.add('character-action-panel');

  const $dragHandleBtnElm = document.createElement('button');
  $dragHandleBtnElm.classList.add('character-action-btn', 'character-item-drag-handle');

  const $dragHandleIconElm = document.createElement('i');
  $dragHandleIconElm.classList.add('fa-solid', 'fa-arrows-up-down');

  $dragHandleBtnElm.appendChild($dragHandleIconElm);

  const $deleteBtnElm = document.createElement('button');
  $deleteBtnElm.classList.add('character-action-btn');
  $deleteBtnElm.addEventListener('click', () => openDeleteMyCharacterModal(nickname));

  const $deleteIconElm = document.createElement('i');
  $deleteIconElm.classList.add('fa-solid', 'fa-trash');

  $deleteBtnElm.appendChild($deleteIconElm);

  $actionPanelElm.append($dragHandleBtnElm, $deleteBtnElm);
  $mainElm.append($actionPanelElm);

  $myCharacterList.appendChild($mainElm);
}

// 삭제 관련
let deleteTargetNickname = null;

$deleteModalCloseBtnInHeader.addEventListener('click', closeDeleteMyCharacterModal);
$deleteModalCloseBtnInContent.addEventListener('click', closeDeleteMyCharacterModal);
$deleteCharacterBtn.addEventListener('click', deleteMyCharacter);

function openDeleteMyCharacterModal(nickname) {
  deleteTargetNickname = nickname;
  modal.openWithId('delete-my-character-modal');
}
function closeDeleteMyCharacterModal() {
  deleteTargetNickname = null;
  modal.closeWithId('delete-my-character-modal');
}

function deleteMyCharacter(e) {
  if (deleteTargetNickname === null) return;

  data.deleteMyCharacter(deleteTargetNickname);
  data.deleteMainCharacterLoado(deleteTargetNickname);

  const $deleteTargetElm = document.querySelector(`.character-item[data-nickname="${deleteTargetNickname}"]`);
  $deleteTargetElm.remove();

  closeDeleteMyCharacterModal();
}

// form 관련
$characterNicknameInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    submitCharacterNickname();
  }
});

$addCharacterBtn.addEventListener('click', () => {
  submitCharacterNickname();
});

async function submitCharacterNickname() {
  // 입력값이 없으면 실행하지 않음
  const nickname = $characterNicknameInput.value.trim();
  if (nickname.length === 0) return;

  // 기존에 있는 캐릭터라면 실행하지 않음
  const _myCharacters = data.getMyCharacters();
  const dataByNickname = _myCharacters.find(item => item.nickname === nickname);
  if (dataByNickname !== undefined) {
    snackbar.error('이미 추가된 캐릭터입니다.');
    return
  }

  utils.showElement($loading);

  try {
    const chracterInfo = await api.getCharacterInfoByNickname(nickname);
    if (chracterInfo === null) {
      snackbar.error('캐릭터가 없습니다. 닉네임을 확인해 주세요.');
      return;
    }

    $characterNicknameInput.value = '';

    const _nickname = chracterInfo.ArmoryProfile.CharacterName;
    const _classname = chracterInfo.ArmoryProfile.CharacterClassName;
    const _level = chracterInfo.ArmoryProfile.ItemMaxLevel;
    data.addMyCharacter(_nickname, _classname, _level);
    addMyCharacterRowElement(_nickname, _classname, _level);

  } catch (error) {
    console.error('submitCharacterNickname', error);
    snackbar.error('캐릭터 추가에 실패하였습니다.');

  } finally {
    utils.hideElement($loading);
  }
}