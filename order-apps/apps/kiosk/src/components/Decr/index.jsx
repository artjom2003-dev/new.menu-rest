import React, { useState, useRef } from 'react'
import styles from './index.module.css'
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";

const Index = ({setIsOpenDecr, setRequest, request, isOpenDecr}) => {

    const [layoutName, setLayoutName] = useState("default");
    const shiftLocked = useRef(false);
    const lastShiftTime = useRef(0);

    const layouts = {
        default: [
            "й ц у к е н г ш щ з х ъ",
            "ф ы в а п р о л д ж э",
            "я ч с м и т ь б ю .",
            "{lock} {space} {backspace}"
        ],
        shift: [
            "Й Ц У К Е Н Г Ш Щ З Х Ъ",
            "Ф Ы В А П Р О Л Д Ж Э",
            "Я Ч С М И Т Ь Б Ю .",
            "{lock} {space} {backspace}"
        ]
    };

    const handleSetDecr = (decr) => {
        const newItem = request.map(item_ => item_.id === isOpenDecr ? {...item_, decr} : item_)
        setRequest(newItem)
    }

    const onChange = (input) => {
        handleSetDecr(input);
        if (layoutName === "shift" && !shiftLocked.current) {
            setLayoutName("default");
        }
    };

    const onKeyPress = (button) => {
        if (button === "{shift}" || button === "{lock}") handleShift();
    };

    const handleShift = () => {
        const now = Date.now();
        if (now - lastShiftTime.current < 400) {
            shiftLocked.current = true;
            setLayoutName("shift");
        } else {
            if (shiftLocked.current) {
                shiftLocked.current = false;
                setLayoutName("default");
            } else {
                setLayoutName(prev => prev === "default" ? "shift" : "default");
            }
        }
        lastShiftTime.current = now;
    };

  return (
    <div className={styles.wrapper_bg}>
        <div className={styles.wrapper}>
            <div className={styles.title}>Комментарий для блюда <br/> "{request.find(item => item.id === isOpenDecr).title_ru}"</div>
            <textarea
            placeholder='Введите описание'
            disabled
            value={request.find(item => item.id === isOpenDecr)?.decr}
            className={styles.text}/>

            <Keyboard
                className={styles.keyboard}
                layout={layouts}
                layoutName={layoutName}
                onChange={onChange}
                onKeyPress={onKeyPress}
                display={{ '{backspace}': '←', '{lock}': '⇧', '{space}': ' ' }}
                buttonTheme={[{ class: 'hg-narrow', buttons: '{lock} {backspace}' }]}
            />

            <div className={styles.buttons}>
                <div className={styles.ok} onClick={() => setIsOpenDecr(null)}>OK</div>
            </div>
        </div>
    </div>
  )
}

export default Index
