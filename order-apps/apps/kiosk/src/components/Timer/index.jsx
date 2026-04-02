import React, { useState, useEffect, useRef } from 'react';
import styles from './index.module.css';

const Index = ({
  handleSubmitRequest,
  setIsOpenName,
  setGuests,
  isActive,
  isActive_,
  setIsActive_,
  setIsActive
}) => {
  const [countdown, setCountdown] = useState(10);
  const inactivityTimer = useRef(null); // Используем useRef для хранения таймера
  const countdownTimer = useRef(null); // Таймер отсчета для активного времени

  // Функция сброса таймера активности
  const resetTimer = () => {
    setIsActive(true);
    setCountdown(10); // Обнуляем countdown при сбросе активности

    // Очищаем предыдущий таймер бездействия, если он существует
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

    // Запускаем новый таймер для бездействия (60 секунд)
    inactivityTimer.current = setTimeout(() => {
      setIsActive(false);
      startCountdown();
    }, 60000); // 60 секунд бездействия
  };

  // Функция для начала отсчета при отсутствии активности
  const startCountdown = () => {
    // Обнуляем countdown на 10 перед запуском нового отсчета
    setCountdown(10);

    // Очищаем предыдущий таймер отсчета, если он существует
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }

    // Запускаем новый отсчет с 10 секунд
    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownTimer.current);
          setIsActive(false);
          handleSubmitRequest();
          setIsOpenName(false);
          setGuests('');
        }
        return prev - 1;
      });
    }, 1000);
  };

    // useEffect(() => {
    //     if (isActive) {
    //         setIsActive_(isActive);
    //     }
    // }, [isActive]);

  // Эффект для отслеживания активности
  useEffect(() => {
    const handleActivity = () => {
      resetTimer(); // Сброс таймера при активности
    };

    // Добавляем обработчики событий активности
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    // Инициализируем первый таймер бездействия при монтировании компонента
    resetTimer();

    // Очистка ресурсов
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, []); // Пустой массив зависимостей, чтобы эффект сработал только один раз при монтировании компонента

  return (
    <>
      {!isActive && countdown > 0 && (
        <div className={styles.wrapper}>
          <p className={styles.timer}>{countdown}</p>
        </div>
      )}

      {/* {((countdown === 0 || countdown === 10)) && <div className={styles.wrapper_def}></div>} */}
    </>
  );
};

export default Index;
