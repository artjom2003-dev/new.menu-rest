import React, { useState, useRef } from 'react';
import styles from './index.module.css';
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";

const Index = ({ guests, setGuests, handleCreateGuests, onBack }) => {

    const [layoutName, setLayoutName] = useState("default");
    const shiftLocked = useRef(false);
    const lastShiftTime = useRef(0);

    const layouts = {
        default: [
            "Й Ц У К Е Н Г Ш Щ З Х Ъ",
            "Ф Ы В А П Р О Л Д Ж Э",
            "Я Ч С М И Т Ь Б Ю .",
            "{lock} {space} {backspace}"
        ],
        shift: [
            "й ц у к е н г ш щ з х ъ",
            "ф ы в а п р о л д ж э",
            "я ч с м и т ь б ю .",
            "{lock} {space} {backspace}"
        ]
    };

    const onChange = (input) => {
        setGuests(input);
        // After typing a letter, revert to lowercase if not locked
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
            // Double tap → CapsLock
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

    const handleSubmit = () => {
        if (guests?.length > 0) {
            handleCreateGuests(guests);
        }
    };

    return (
        <div className={styles.name}>
            <div className={styles.nameBlock}>
                <div className={styles.nameTitle}>Введите Ваше имя</div>

                <input
                    className={styles.nameInput}
                    value={guests}
                    placeholder={""}
                    disabled
                />

                <Keyboard
                    className={styles.keyboard}
                    layout={layouts}
                    layoutName={layoutName}
                    onChange={onChange}
                    onKeyPress={onKeyPress}
                    display={{ '{backspace}': '←', '{lock}': '⇧', '{space}': ' ' }}
                    buttonTheme={[{ class: 'hg-narrow', buttons: '{lock} {backspace}' }]}
                />

                <div className={styles.nameButtons}>
                    <div className={styles.backBtn} onClick={onBack}>Назад</div>
                    <div className={styles.nameButton} onClick={handleSubmit}>OK</div>
                </div>
            </div>
        </div>
    );
};

export default Index;
