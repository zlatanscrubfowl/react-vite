<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\FobiUser;

class VerifyEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $tokenType;
    private $frontendUrl;

    /**
     * Create a new message instance.
     *
     * @param FobiUser $user
     * @param string $tokenType
     * @return void
     */
    public function __construct(FobiUser $user, $tokenType)
    {
        $this->user = $user;
        $this->tokenType = $tokenType;
        $this->frontendUrl = 'https://talinara.com';
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        try {
            $token = $this->getToken();
            $verificationUrl = $this->frontendUrl . '/verify-email/' . urlencode($token) . '/' . urlencode($this->tokenType);

            \Log::info('Building verification email', [
                'user_id' => $this->user->id,
                'token_type' => $this->tokenType,
                'verification_url' => $verificationUrl
            ]);

            return $this->view('emails.verify')
                       ->subject('Verifikasi Email FOBI')
                       ->with([
                           'user' => $this->user,
                           'verificationUrl' => $verificationUrl,
                           'tokenType' => $this->tokenType
                       ]);
        } catch (\Exception $e) {
            \Log::error('Error building verification email:', [
                'error' => $e->getMessage(),
                'user_id' => $this->user->id,
                'token_type' => $this->tokenType
            ]);
            throw $e;
        }
    }

    /**
     * Get the appropriate token based on token type.
     *
     * @return string
     * @throws \Exception
     */
    private function getToken()
    {
        try {
            switch ($this->tokenType) {
                case 'email_verification_token':
                    return $this->user->email_verification_token;
                case 'burungnesia_email_verification_token':
                    return $this->user->burungnesia_email_verification_token;
                case 'kupunesia_email_verification_token':
                    return $this->user->kupunesia_email_verification_token;
                default:
                    \Log::error('Invalid token type:', [
                        'given_type' => $this->tokenType,
                        'user_id' => $this->user->id
                    ]);
                    throw new \Exception('Invalid token type: ' . $this->tokenType);
            }
        } catch (\Exception $e) {
            \Log::error('Error getting token:', [
                'error' => $e->getMessage(),
                'token_type' => $this->tokenType,
                'user_id' => $this->user->id
            ]);
            throw $e;
        }
    }
}
