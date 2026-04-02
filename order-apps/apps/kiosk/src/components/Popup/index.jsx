import React from 'react'
import styles from './index.module.scss'
import Mint from '../../assets/img/mint.png'

const Index = ({request, getUniqueArray, handleSubmitRequest, setSteps, steps, orderId, count = [], totalPrice = 0}) => {
    return (
        <div className={styles.request_bg}>
            <div className={styles.request_popup}>
                <div>
                    <div className={styles.requestTitle}>Спасибо!</div>
                    <div className={styles.requestTitle}>Ваш заказ № {orderId}</div>
                </div>

                <div className={styles.requestList}>
                    {getUniqueArray(request).map((item, index) => {
                        return (
                            <div key={index} className={styles.requestItem}>
                                {item.title_ru}
                                - {request
                                    .filter(item_ => item_.id === item.id)
                                    .length}
                            </div>
                        )
                    })
}
                    <div className={styles.price}>Итого: {totalPrice} руб.</div>
                </div>
                <div className={styles.endText}>
                    <div className={styles.cancel} onClick={() => handleSubmitRequest('cancel')}>отменить заказ</div>
                    <div className={styles.off}>К Вам подойдет официант</div>
                    <div className={styles.ok} onClick={() => handleSubmitRequest('ok')}>
                        <img src={Mint} className={styles.mint} alt='Mint'/>
                        ОК
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Index