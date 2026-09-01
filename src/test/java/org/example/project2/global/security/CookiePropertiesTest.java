package org.example.project2.global.security;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CookiePropertiesTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void productionCrossSiteCookieConfigurationIsValid() {
        CookieProperties properties = new CookieProperties(true, "None");

        assertThat(validator.validate(properties)).isEmpty();
    }

    @Test
    void sameSiteNoneRequiresSecureCookie() {
        CookieProperties properties = new CookieProperties(false, "None");

        assertThat(validator.validate(properties)).isNotEmpty();
    }

    @Test
    void sameSiteMustBeAStandardValue() {
        CookieProperties properties = new CookieProperties(false, "CrossSite");

        assertThat(validator.validate(properties)).isNotEmpty();
    }
}
